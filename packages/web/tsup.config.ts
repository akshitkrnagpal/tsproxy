import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  external: ["react", "react-dom", "react-instantsearch", "@tsproxy/js"],
  tsconfig: "tsconfig.build.json",
});
