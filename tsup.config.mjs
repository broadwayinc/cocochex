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
    sourcemap: true,
    minify: false,
    define: sharedDefine,
    outDir: "dist",
    outExtension() {
      return { js: ".js" };
    },
  },
]);
