#!/usr/bin/env node

import { Command } from "commander";
import { init } from "./commands/init.js";
import { dev } from "./commands/dev.js";
import { start } from "./commands/start.js";
import { build } from "./commands/build.js";
import { seed } from "./commands/seed.js";
import { migrate } from "./commands/migrate.js";
import { health } from "./commands/health.js";
import { generate } from "./commands/generate.js";

const program = new Command();

program
  .name("tsproxy")
  .description("Typesense search proxy framework")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a new tsproxy project")
  .action(init);

program
  .command("dev")
  .description("Start the proxy in development mode")
  .option("-p, --port <port>", "Port to listen on")
  .option("-c, --config <path>", "Path to config file")
  .action(dev);

program
  .command("start")
  .description("Start the proxy in production mode")
  .option("-p, --port <port>", "Port to listen on")
  .option("-c, --config <path>", "Path to config file")
  .action(start);

program
  .command("build")
  .description("Build the proxy for production")
  .action(build);

program
  .command("seed [file]")
  .description("Seed Typesense with data from a JSON/JSONL file")
  .option("--collection <name>", "Collection name")
  .option("--locale <locale>", "Locale for the collection")
  .option("--locales", "Create locale-specific collections")
  .action(seed);

program
  .command("migrate")
  .description("Sync Typesense schema with config")
  .option("--apply", "Apply changes (default is dry-run)")
  .option("--drop", "Drop and recreate collections")
  .action(migrate);

program
  .command("health")
  .description("Check Typesense and Redis connectivity")
  .action(health);

program
  .command("generate")
  .description("Generate tsproxy.config.ts from existing Typesense schema")
  .option("--host <host>", "Typesense host")
  .option("--port <port>", "Typesense port")
  .option("--key <key>", "Typesense API key")
  .option("-o, --output <path>", "Output file path", "tsproxy.config.ts")
  .action(generate);

program.parse();
