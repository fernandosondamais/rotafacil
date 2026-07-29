import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

test("scripts de produção usam Next.js", () => {
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.match(packageJson.scripts.start, /next start/);
});

test("dependências de runtime incluem pg e next", () => {
  assert.ok(packageJson.dependencies.next);
  assert.ok(packageJson.dependencies.pg);
});
