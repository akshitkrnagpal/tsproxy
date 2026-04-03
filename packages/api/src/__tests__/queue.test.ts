import { describe, it, expect } from "vitest";
import { IngestionQueue } from "../lib/queue.js";

describe("IngestionQueue", () => {
  it("should execute tasks and return results", async () => {
    const queue = new IngestionQueue({ concurrency: 2, maxSize: 100 });
    const result = await queue.enqueue(async () => "hello");
    expect(result).toBe("hello");
  });

  it("should limit concurrency", async () => {
    const queue = new IngestionQueue({ concurrency: 2, maxSize: 100 });
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const createTask = () =>
      queue.enqueue(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((resolve) => setTimeout(resolve, 50));
        currentConcurrent--;
        return true;
      });

    await Promise.all([
      createTask(),
      createTask(),
      createTask(),
      createTask(),
    ]);

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("should reject when queue is full", async () => {
    const queue = new IngestionQueue({ concurrency: 1, maxSize: 2 });

    // Fill up the queue with slow tasks
    const slow = () => new Promise((resolve) => setTimeout(resolve, 200));

    // These will start processing / queue up
    const p1 = queue.enqueue(slow);
    const p2 = queue.enqueue(slow);
    const p3 = queue.enqueue(slow);

    // This should fail since queue is full (maxSize=2 pending + 1 active)
    await expect(queue.enqueue(slow)).rejects.toThrow("Queue is full");

    // Clean up
    await Promise.all([p1, p2, p3]);
  });

  it("should track completed and failed counts", async () => {
    const queue = new IngestionQueue({ concurrency: 2, maxSize: 100 });

    await queue.enqueue(async () => "ok");

    try {
      await queue.enqueue(async () => {
        throw new Error("fail");
      });
    } catch {
      // expected
    }

    const stats = await queue.stats();
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
  });

  it("should report correct stats", async () => {
    const queue = new IngestionQueue({ concurrency: 5, maxSize: 10000 });
    const stats = await queue.stats();

    expect(stats.pending).toBe(0);
    expect(stats.active).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.failed).toBe(0);
    expect(stats.maxSize).toBe(10000);
    expect(stats.concurrency).toBe(5);
  });

  it("should propagate errors from tasks", async () => {
    const queue = new IngestionQueue({ concurrency: 2, maxSize: 100 });

    await expect(
      queue.enqueue(async () => {
        throw new Error("task error");
      })
    ).rejects.toThrow("task error");
  });
});
