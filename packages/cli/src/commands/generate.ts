import * as p from "@clack/prompts";
import pc from "picocolors";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export async function generate(opts: { host?: string; port?: string; key?: string; output?: string }) {
  p.intro(pc.bgCyan(pc.black(" tsproxy generate ")));

  const tsHost = opts.host || process.env.TYPESENSE_HOST || "localhost";
  const tsPort = opts.port || process.env.TYPESENSE_PORT || "8108";
  const tsApiKey = opts.key || process.env.TYPESENSE_API_KEY;

  if (!tsApiKey) {
    p.log.error("Typesense API key is required. Set TYPESENSE_API_KEY or pass --key.");
    process.exit(1);
  }

  const s = p.spinner();
  s.start("Fetching collections from Typesense");

  let collections: any[];
  try {
    const res = await fetch(`http://${tsHost}:${tsPort}/collections`, {
      headers: { "X-TYPESENSE-API-KEY": tsApiKey },
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    collections = await res.json() as any[];
  } catch (err) {
    s.stop("Failed to connect");
    p.log.error(`Cannot connect to Typesense at ${tsHost}:${tsPort}`);
    p.log.error((err as Error).message);
    process.exit(1);
  }

  s.stop(`Found ${collections.length} collection(s)`);

  if (collections.length === 0) {
    p.log.warn("No collections found. Create some collections first.");
    process.exit(0);
  }

  // Show collections and let user select
  const selected = await p.multiselect({
    message: "Which collections to include?",
    options: collections.map((col) => ({
      value: col.name,
      label: `${col.name} (${col.num_documents} docs, ${col.fields.length} fields)`,
    })),
    required: true,
  });

  if (p.isCancel(selected)) return process.exit(0);

  // Map Typesense field types to tsproxy config
  const TYPE_MAP: Record<string, string> = {
    string: "string",
    "string[]": "string[]",
    int32: "int32",
    "int32[]": "int32[]",
    int64: "int64",
    "int64[]": "int64[]",
    float: "float",
    "float[]": "float[]",
    bool: "bool",
    "bool[]": "bool[]",
    geopoint: "geopoint",
    "geopoint[]": "geopoint[]",
    auto: "auto",
    object: "object",
    "object[]": "object[]",
  };

  // Generate config
  const collectionConfigs: string[] = [];

  for (const colName of selected as string[]) {
    const col = collections.find((c) => c.name === colName);
    if (!col) continue;

    const fieldLines: string[] = [];
    for (const field of col.fields) {
      if (field.name === ".*") continue; // skip auto schema

      const type = TYPE_MAP[field.type] || "string";
      const props: string[] = [`type: "${type}"`];

      // Infer searchable from string fields that are indexed
      if (
        (field.type === "string" || field.type === "string[]") &&
        field.index !== false
      ) {
        props.push("searchable: true");
      }
      if (field.facet) props.push("facet: true");
      if (field.sort) props.push("sortable: true");
      if (field.optional) props.push("optional: true");
      if (field.infix) props.push("infix: true");

      fieldLines.push(`        ${field.name}: { ${props.join(", ")} },`);
    }

    const sortField = col.default_sorting_field
      ? `\n      defaultSortBy: "${col.default_sorting_field}",`
      : "";

    collectionConfigs.push(`    ${colName}: {
      fields: {
${fieldLines.join("\n")}
      },${sortField}
    },`);
  }

  const configContent = `import { defineConfig } from "@tsproxy/api";

export default defineConfig({
  typesense: {
    host: "${tsHost}",
    port: ${tsPort},
    protocol: "http",
    apiKey: process.env.TYPESENSE_API_KEY || "${tsApiKey}",
  },

  server: {
    port: 3000,
    apiKey: process.env.PROXY_API_KEY || "change-me",
  },

  cache: { ttl: 60, maxSize: 1000 },
  queue: { concurrency: 5, maxSize: 10000 },
  rateLimit: { search: 100, ingest: 30 },

  collections: {
${collectionConfigs.join("\n\n")}
  },
});
`;

  const outputPath = resolve(process.cwd(), opts.output || "tsproxy.config.ts");

  if (existsSync(outputPath)) {
    const overwrite = await p.confirm({
      message: `${opts.output || "tsproxy.config.ts"} already exists. Overwrite?`,
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      // Print to stdout instead
      p.log.info("Generated config:");
      console.log(configContent);
      p.outro("Config printed to stdout (file not written).");
      return;
    }
  }

  writeFileSync(outputPath, configContent);
  p.outro(pc.green(`Config written to ${opts.output || "tsproxy.config.ts"}`));
}
