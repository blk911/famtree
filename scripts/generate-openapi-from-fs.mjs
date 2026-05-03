/**
 * Discovers App Router API handlers and writes openapi/openapi.generated.yaml
 * with stub paths so Schemathesis can reach every endpoint.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, "app", "api");
const OUT = path.join(ROOT, "openapi", "openapi.generated.yaml");

const METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"]);

function walkRoutes(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkRoutes(p, acc);
    else if (ent.name === "route.ts") acc.push(p);
  }
  return acc;
}

/** /api/a/{b}/c from app/api/a/[b]/c/route.ts */
function openApiPathFromFile(file) {
  const rel = path.relative(API_ROOT, path.dirname(file)).split(path.sep).join("/");
  const segments = rel === "" ? [] : rel.split("/").filter(Boolean);
  const oasSeg = segments.map((s) => (s.startsWith("[") && s.endsWith("]") ? `{${s.slice(1, -1)}}` : s));
  return `/api${oasSeg.length ? `/${oasSeg.join("/")}` : ""}`;
}

function detectExportedMethods(src) {
  const found = [];
  const re = /\bexport\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    if (METHODS.has(m[1])) found.push(m[1]);
  }
  return [...new Set(found)];
}

function stubOperation(method) {
  const lower = method.toLowerCase();
  return `${lower}:
      summary: Generated stub (${method})
      responses:
        "200":
          description: OK
        "4XX":
          description: Client error
        "5XX":
          description: Server error`;
}

function main() {
  const routes = walkRoutes(API_ROOT).sort();
  /** @type {Record<string, string[]>} */
  const pathToMethods = {};

  for (const file of routes) {
    const src = fs.readFileSync(file, "utf8");
    const oasPath = openApiPathFromFile(file);
    const methods = detectExportedMethods(src);
    if (!methods.length) continue;
    if (!pathToMethods[oasPath]) pathToMethods[oasPath] = [];
    for (const m of methods) {
      if (!pathToMethods[oasPath].includes(m)) pathToMethods[oasPath].push(m);
    }
  }

  const keys = Object.keys(pathToMethods).sort();
  let body = `openapi: 3.0.0\ninfo:\n  title: Generated routes\n  version: 1.0.0\npaths:\n`;
  for (const k of keys) {
    body += `  ${JSON.stringify(k)}:\n`;
    for (const method of pathToMethods[k].sort()) {
      const block = stubOperation(method);
      body += `${block
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n")}\n`;
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, body, "utf8");
  console.log(`Wrote ${keys.length} paths -> ${path.relative(ROOT, OUT)}`);
}

main();
