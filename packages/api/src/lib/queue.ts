import { Queue, Worker, type Job } from "bullmq";

export interface QueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  maxSize: number;
  concurrency: number;
  backend: "redis" | "memory";
}

export interface QueueOptions {
  concurrency: number;
  maxSize: number;
  redis?: { host?: string; port?: number };
}

/**
 * Ingestion queue backed by BullMQ (Redis) with in-memory fallback.
 *
 * When Redis is available, jobs are persisted and survive server restarts.
 * When Redis is unavailable, falls back to a simple in-memory queue.
 */
export class IngestionQueue {
  private readonly concurrency: number;
  private readonly maxSize: number;
  private backend: "redis" | "memory" = "memory";

  // BullMQ (Redis) state
  private bullQueue: Queue | null = null;
  private bullWorker: Worker | null = null;
  private jobHandlers = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    fn: () => Promise<unknown>;
  }>();

  // In-memory fallback state
  private memPending: Array<{
    fn: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];
  private memActiveCount = 0;
  private memCompletedCount = 0;
  private memFailedCount = 0;

  constructor(options: QueueOptions) {
    this.concurrency = options.concurrency;
    this.maxSize = options.maxSize;

    if (options.redis) {
      this.initRedis(options.redis);
    }
  }

  private initRedis(redis: { host?: string; port?: number }) {
    const connection = {
      host: redis.host || "localhost",
      port: redis.port || 6379,
    };

    try {
      this.bullQueue = new Queue("tsproxy:ingest", { connection });
      this.bullWorker = new Worker(
        "tsproxy:ingest",
        async (job: Job) => {
          const handler = this.jobHandlers.get(job.id!);
          if (!handler) {
            throw new Error(`No handler for job ${job.id}`);
          }
          try {
            const result = await handler.fn();
            handler.resolve(result);
            return result;
          } catch (err) {
            handler.reject(err);
            throw err;
          } finally {
            this.jobHandlers.delete(job.id!);
          }
        },
        { connection, concurrency: this.concurrency },
      );

      this.bullWorker.on("error", (err) => {
        console.warn("[queue] BullMQ worker error, falling back to memory:", err.message);
        this.fallbackToMemory();
      });

      this.bullQueue.on("error", (err) => {
        console.warn("[queue] BullMQ queue error, falling back to memory:", err.message);
        this.fallbackToMemory();
      });

      this.backend = "redis";
      console.log(`[queue] Using Redis at ${connection.host}:${connection.port}`);
    } catch (err) {
      console.warn("[queue] Failed to connect to Redis, using in-memory queue:", (err as Error).message);
      this.backend = "memory";
    }
  }

  private fallbackToMemory() {
    if (this.backend === "memory") return;
    this.backend = "memory";

    // Reject any pending BullMQ jobs
    for (const [, handler] of this.jobHandlers) {
      handler.reject(new Error("Queue backend switched to memory"));
    }
    this.jobHandlers.clear();

    // Clean up BullMQ
    this.bullWorker?.close().catch(() => {});
    this.bullQueue?.close().catch(() => {});
    this.bullWorker = null;
    this.bullQueue = null;

    console.log("[queue] Fell back to in-memory queue");
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this.backend === "redis" && this.bullQueue) {
      return this.enqueueRedis(fn);
    }
    return this.enqueueMemory(fn);
  }

  private async enqueueRedis<T>(fn: () => Promise<T>): Promise<T> {
    const count = await this.bullQueue!.getJobCountByTypes("waiting", "active");
    if (count >= this.maxSize) {
      const error = new Error("Queue is full");
      (error as Error & { status: number }).status = 429;
      throw error;
    }

    return new Promise<T>((resolve, reject) => {
      const jobId = `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.jobHandlers.set(jobId, {
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.bullQueue!.add("ingest", {}, { jobId }).catch((err) => {
        this.jobHandlers.delete(jobId);
        reject(err);
      });
    });
  }

  private async enqueueMemory<T>(fn: () => Promise<T>): Promise<T> {
    if (this.memPending.length >= this.maxSize) {
      const error = new Error("Queue is full");
      (error as Error & { status: number }).status = 429;
      throw error;
    }

    return new Promise<T>((resolve, reject) => {
      this.memPending.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processMemory();
    });
  }

  async stats(): Promise<QueueStats> {
    if (this.backend === "redis" && this.bullQueue) {
      const counts = await this.bullQueue.getJobCounts("waiting", "active", "completed", "failed");
      return {
        pending: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        maxSize: this.maxSize,
        concurrency: this.concurrency,
        backend: "redis",
      };
    }

    return {
      pending: this.memPending.length,
      active: this.memActiveCount,
      completed: this.memCompletedCount,
      failed: this.memFailedCount,
      maxSize: this.maxSize,
      concurrency: this.concurrency,
      backend: "memory",
    };
  }

  async close() {
    await this.bullWorker?.close();
    await this.bullQueue?.close();
  }

  private processMemory(): void {
    while (this.memActiveCount < this.concurrency && this.memPending.length > 0) {
      const item = this.memPending.shift();
      if (!item) break;

      this.memActiveCount++;
      item
        .fn()
        .then((result) => {
          this.memCompletedCount++;
          item.resolve(result);
        })
        .catch((error) => {
          this.memFailedCount++;
          item.reject(error);
        })
        .finally(() => {
          this.memActiveCount--;
          this.processMemory();
        });
    }
  }
}
