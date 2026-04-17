/**
 * One-shot seed script. Reads data/products.json and pushes it to the
 * embedded tsproxy via bulk-import.
 *
 *   pnpm dev          # in one terminal, starts Next on :3001
 *   pnpm seed         # in another — populates the products collection
 *
 * The ingest endpoint is auth-gated by `TSPROXY_INGEST_API_KEY` (see
 * tsproxy.config.ts). Keep the default ingest key out of production.
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.TSPROXY_URL ?? "http://localhost:3001/api/tsproxy";
const API_KEY = process.env.TSPROXY_INGEST_API_KEY ?? "ingest-secret-key";
const COLLECTION = "products";

async function main() {
  const productsPath = resolve(__dirname, "..", "data", "products.json");
  const raw = await readFile(productsPath, "utf8");
  const products = JSON.parse(raw) as Array<Record<string, unknown>>;

  console.log(`Seeding ${products.length} products into ${BASE_URL}/api/ingest/${COLLECTION}/documents/import`);

  const res = await fetch(
    `${BASE_URL}/api/ingest/${COLLECTION}/documents/import`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(products),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    console.error(`Seed failed (${res.status}):`, text);
    process.exit(1);
  }
  console.log("Seed response:", text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
