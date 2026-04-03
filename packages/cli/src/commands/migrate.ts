import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import pc from "picocolors";

export async function migrate(opts: { apply?: boolean; drop?: boolean }) {
  // Load the config file
  const configPath = findConfig();
  if (!configPath) {
    console.error("No tsproxy.config.ts found. Run: tsproxy init");
    process.exit(1);
  }

  let config: any;
  try {
    const mod = await import(pathToFileURL(configPath).href);
    config = mod.default || mod;
  } catch (err) {
    console.error("Failed to load config:", (err as Error).message);
    process.exit(1);
  }

  const collections = config.collections || {};
  const collectionNames = Object.keys(collections);

  if (collectionNames.length === 0) {
    console.log("No collections defined in config.");
    return;
  }

  const tsHost = config.typesense?.host || process.env.TYPESENSE_HOST || "localhost";
  const tsPort = config.typesense?.port || process.env.TYPESENSE_PORT || 8108;
  const tsProtocol = config.typesense?.protocol || "http";
  const tsApiKey = config.typesense?.apiKey || process.env.TYPESENSE_API_KEY;

  if (!tsApiKey) {
    console.error("TYPESENSE_API_KEY not set.");
    process.exit(1);
  }

  const baseUrl = `${tsProtocol}://${tsHost}:${tsPort}`;

  // Get existing collections from Typesense
  let existing: Record<string, any> = {};
  try {
    const res = await fetch(`${baseUrl}/collections`, {
      headers: { "X-TYPESENSE-API-KEY": tsApiKey },
    });
    const cols = await res.json();
    for (const col of cols as any[]) {
      existing[col.name] = col;
    }
  } catch (err) {
    console.error("Cannot connect to Typesense:", (err as Error).message);
    process.exit(1);
  }

  console.log(pc.bold("\nMigration plan:\n"));

  const actions: Array<{ type: string; name: string; details: string }> = [];

  for (const [name, def] of Object.entries(collections) as [string, any][]) {
    const names = [name];
    // Add locale variants
    if (def.locales?.length) {
      for (const locale of def.locales) {
        names.push(`${name}_${locale}`);
      }
    }

    for (const colName of names) {
      if (existing[colName]) {
        if (opts.drop) {
          actions.push({
            type: "drop+create",
            name: colName,
            details: `Drop and recreate with ${Object.keys(def.fields || {}).length} fields`,
          });
        } else {
          // Diff fields
          const existingFields = new Set(
            (existing[colName].fields || []).map((f: any) => f.name),
          );
          const configFields = Object.keys(def.fields || {}).filter(
            (f) => !(def.fields[f] as any).compute,
          );
          const newFields = configFields.filter((f) => !existingFields.has(f));
          if (newFields.length > 0) {
            actions.push({
              type: "update",
              name: colName,
              details: `Add fields: ${newFields.join(", ")}`,
            });
          } else {
            actions.push({
              type: "ok",
              name: colName,
              details: "Up to date",
            });
          }
        }
      } else {
        actions.push({
          type: "create",
          name: colName,
          details: `Create with ${Object.keys(def.fields || {}).length} fields`,
        });
      }
    }
  }

  for (const action of actions) {
    const icon =
      action.type === "ok"
        ? pc.green("✓")
        : action.type === "create"
          ? pc.cyan("+")
          : action.type === "update"
            ? pc.yellow("~")
            : pc.red("!");
    console.log(`  ${icon} ${pc.bold(action.name)} — ${action.details}`);
  }

  const pendingActions = actions.filter((a) => a.type !== "ok");
  if (pendingActions.length === 0) {
    console.log(pc.green("\nAll collections are up to date."));
    return;
  }

  if (!opts.apply) {
    console.log(
      pc.yellow(`\nDry run — ${pendingActions.length} change(s). Run with --apply to execute.`),
    );
    return;
  }

  // Apply changes
  console.log(pc.bold("\nApplying...\n"));

  for (const action of pendingActions) {
    const colName = action.name;
    const baseName = colName.includes("_")
      ? colName.split("_").slice(0, -1).join("_")
      : colName;
    const def = collections[baseName] || collections[colName];
    if (!def) continue;

    const schema = buildSchema(colName, def);

    try {
      if (action.type === "drop+create") {
        await fetch(`${baseUrl}/collections/${colName}`, {
          method: "DELETE",
          headers: { "X-TYPESENSE-API-KEY": tsApiKey },
        });
        await fetch(`${baseUrl}/collections`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": tsApiKey,
          },
          body: JSON.stringify(schema),
        });
        console.log(`  ${pc.green("✓")} ${colName} — dropped and recreated`);
      } else if (action.type === "create") {
        await fetch(`${baseUrl}/collections`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": tsApiKey,
          },
          body: JSON.stringify(schema),
        });
        console.log(`  ${pc.green("✓")} ${colName} — created`);
      } else if (action.type === "update") {
        // Typesense supports adding fields via PATCH
        const existingFields = new Set(
          (existing[colName].fields || []).map((f: any) => f.name),
        );
        const newFields = Object.entries(def.fields || {})
          .filter(([name, f]: [string, any]) => !existingFields.has(name) && !f.compute)
          .map(([name, f]: [string, any]) => ({
            name,
            type: f.type,
            ...(f.facet ? { facet: true } : {}),
            ...(f.optional ? { optional: true } : {}),
          }));

        await fetch(`${baseUrl}/collections/${colName}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": tsApiKey,
          },
          body: JSON.stringify({ fields: newFields }),
        });
        console.log(`  ${pc.green("✓")} ${colName} — updated`);
      }
    } catch (err) {
      console.error(
        `  ${pc.red("✗")} ${colName} — ${(err as Error).message}`,
      );
    }
  }

  console.log(pc.green("\nMigration complete."));
}

function buildSchema(name: string, def: any) {
  const fields = Object.entries(def.fields || {})
    .filter(([, f]: [string, any]) => !f.compute)
    .map(([fieldName, f]: [string, any]) => ({
      name: fieldName,
      type: f.type,
      ...(f.facet ? { facet: true } : {}),
      ...(f.optional ? { optional: true } : {}),
      ...(f.sortable && !["int32", "int64", "float", "bool"].includes(f.type)
        ? { sort: true }
        : {}),
      ...(f.infix ? { infix: true } : {}),
    }));

  return {
    name,
    fields,
    ...(def.defaultSortBy ? { default_sorting_field: def.defaultSortBy } : {}),
  };
}

function findConfig(): string | null {
  const names = ["tsproxy.config.ts", "tsproxy.config.js", "tsproxy.config.mjs"];
  let dir = process.cwd();
  const root = resolve("/");
  while (dir !== root) {
    for (const name of names) {
      const p = resolve(dir, name);
      if (existsSync(p)) return p;
    }
    dir = resolve(dir, "..");
  }
  return null;
}
