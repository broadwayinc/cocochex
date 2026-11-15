import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const sharedDefine = {
  _COCOCHEX_VERSION__: JSON.stringify(pkg.version),
};

export default defineConfig([
  {
    entry: ["index.ts"],
    format: ["esm", "cjs"],
    // Make `require("cocochex")` return the function itself instead of `{ default }`.
    cjsInterop: true,
    splitting: true,
    // Keep `require("cocochex").default` working for existing CJS users.
    footer({ format }) {
      return format === "cjs" ? { js: "exports.default.default = exports.default;" } : {};
    },
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    define: sharedDefine,
    outDir: "dist",
    outExtension({ format }) {
      if (format === "esm") {
        return { js: ".js" };
      }

      return { js: ".cjs" };
    },
  },
  {
    entry: { cocochex: "index.ts" },
    format: ["iife"],
    globalName: "cocochex",
    // Expose the function itself as the global, not `{ default }`.
    footer: { js: "cocochex = cocochex.default;" },
    sourcemap: true,
    minify: false,
    define: sharedDefine,
    outDir: "dist",
    outExtension() {
      return { js: ".js" };
    },
  },
]);
