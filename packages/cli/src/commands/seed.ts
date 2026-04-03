import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pc from "picocolors";

export async function seed(
  file: string | undefined,
  opts: { collection?: string; locale?: string; locales?: boolean },
) {
  // Load config to get proxy URL and API key
  const proxyUrl = process.env.PROXY_URL || "http://localhost:3000";
  const apiKey = process.env.PROXY_API_KEY || "change-me";
  const collection = opts.collection || "products";

  if (!file) {
    console.error("Usage: tsproxy seed <file.json> --collection <name>");
    console.error("  File should be a JSON array of documents.");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), file);
  let documents: Record<string, unknown>[];

  try {
    const content = readFileSync(filePath, "utf-8");
    // Support JSON array or JSONL
    if (content.trim().startsWith("[")) {
      documents = JSON.parse(content);
    } else {
      documents = content
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
    }
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, (err as Error).message);
    process.exit(1);
  }

  console.log(
    `Seeding ${pc.bold(String(documents.length))} documents into ${pc.bold(collection)} via ingest API...`,
  );

  // Seed via the proxy's ingest endpoint (applies computed fields, uses queue)
  const url = `${proxyUrl}/api/ingest/${collection}/documents/import`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };

  if (opts.locale) {
    headers["X-Locale"] = opts.locale;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(documents),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error(
        pc.red(`Failed: ${res.status} ${(body as any).error || res.statusText}`),
      );
      process.exit(1);
    }

    const result = await res.json();
    const results = Array.isArray(result) ? result : [result];
    const successes = results.filter((r: any) => r.success !== false).length;
    const failures = results.length - successes;

    console.log(
      pc.green(`Imported ${successes} documents`) +
        (failures > 0 ? pc.red(` (${failures} failures)`) : ""),
    );

    // Seed locale variants
    if (opts.locales) {
      // Load config to get locale list
      console.log("\nTo seed locale-specific collections, run:");
      console.log(
        `  tsproxy seed ${file} --collection ${collection} --locale en`,
      );
      console.log(
        `  tsproxy seed ${file} --collection ${collection} --locale fr`,
      );
    }
  } catch (err) {
    console.error(pc.red("Connection failed:"), (err as Error).message);
    console.error("Is the proxy running? Start with: tsproxy dev");
    process.exit(1);
  }
}
