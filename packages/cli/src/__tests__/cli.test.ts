import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const CLI_PATH = resolve(__dirname, "../../dist/index.js");

describe("CLI", () => {
  it("shows help", () => {
    const output = execSync(`node ${CLI_PATH} --help`, { encoding: "utf-8" });
    expect(output).toContain("tsproxy");
    expect(output).toContain("init");
    expect(output).toContain("dev");
    expect(output).toContain("migrate");
    expect(output).toContain("seed");
    expect(output).toContain("health");
    expect(output).toContain("generate");
  });

  it("shows version", () => {
    const output = execSync(`node ${CLI_PATH} --version`, { encoding: "utf-8" });
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("init --help shows options", () => {
    const output = execSync(`node ${CLI_PATH} init --help`, { encoding: "utf-8" });
    expect(output).toContain("Initialize");
  });

  it("migrate --help shows options", () => {
    const output = execSync(`node ${CLI_PATH} migrate --help`, { encoding: "utf-8" });
    expect(output).toContain("--apply");
    expect(output).toContain("--drop");
  });

  it("seed --help shows options", () => {
    const output = execSync(`node ${CLI_PATH} seed --help`, { encoding: "utf-8" });
    expect(output).toContain("--collection");
    expect(output).toContain("--locale");
  });

  it("generate --help shows options", () => {
    const output = execSync(`node ${CLI_PATH} generate --help`, { encoding: "utf-8" });
    expect(output).toContain("--host");
    expect(output).toContain("--key");
    expect(output).toContain("--output");
  });
});
