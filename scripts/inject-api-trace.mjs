/**
 * Wraps exported GET/POST/PATCH/PUT/DELETE handlers with withApiTrace (brace-safe string transform).
 * Run: node scripts/inject-api-trace.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const API = path.join(ROOT, "app", "api");

const METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];

function walkRoutes(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkRoutes(p, acc);
    else if (ent.name === "route.ts") acc.push(p);
  }
  return acc;
}

function routeLiteral(file) {
  const rel = path.relative(API, path.dirname(file)).split(path.sep).join("/");
  return `/api${rel ? `/${rel}` : ""}`;
}

/** Matching `}` for `{` at openBraceIdx */
function matchingBrace(src, openBraceIdx) {
  let depth = 0;
  let i = openBraceIdx;
  let inS = null;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inS) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === inS) inS = null;
      i++;
      continue;
    }

    if (c === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inS = c;
      i++;
      continue;
    }

    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function findClosingParen(src, openParenIdx) {
  let depth = 0;
  let i = openParenIdx;
  let inS = null;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inS) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === inS) inS = null;
      i++;
      continue;
    }

    if (c === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inS = c;
      i++;
      continue;
    }

    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function findTopLevelComma(paramStr) {
  let depth = 0;
  let i = 0;
  let inS = null;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < paramStr.length) {
    const c = paramStr[i];
    const next = paramStr[i + 1];
    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inS) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === inS) inS = null;
      i++;
      continue;
    }
    if (c === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inS = c;
      i++;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) return i;
    i++;
  }
  return -1;
}

function splitSecondParamDestructured(secondFull) {
  const s = secondFull.trim();
  if (!s.startsWith("{")) return null;
  const open = s.indexOf("{");
  const close = matchingBrace(s, open);
  if (close < 0) return null;
  const binding = s.slice(0, close + 1);
  let rest = s.slice(close + 1).trim();
  if (!rest.startsWith(":")) return null;
  const typ = rest.slice(1).trim();
  return { binding, type: typ };
}

function firstBindingName(firstParam) {
  return firstParam.split(":")[0].trim().replace(/^readonly\s+/, "");
}

function transformFile(src, routeStr) {
  if (src.includes("withApiTrace(")) return src;

  const fnRegex = new RegExp(`\\bexport\\s+async\\s+function\\s+(${METHODS.join("|")})\\s*\\(`, "g");
  /** @type {{start:number,end:number,text:string}[]} */
  const replacements = [];

  let m;
  while ((m = fnRegex.exec(src))) {
    const method = m[1];
    const openParen = m.index + m[0].length - 1;
    const closeParen = findClosingParen(src, openParen);
    if (closeParen < 0) continue;

    const paramsRaw = src.slice(openParen + 1, closeParen).trim();
    const braceOpen = src.indexOf("{", closeParen);
    if (braceOpen < 0) continue;
    const braceClose = matchingBrace(src, braceOpen);
    if (braceClose < 0) continue;

    const innerBody = src.slice(braceOpen + 1, braceClose).trimEnd();

    let outerParams;
    let innerParams;
    let prelude = "";
    let fourth = "";

    const commaIdx = findTopLevelComma(paramsRaw);

    if (commaIdx === -1) {
      if (!paramsRaw) {
        outerParams = "req: NextRequest";
        innerParams = "req: NextRequest";
      } else {
        outerParams = paramsRaw;
        innerParams = paramsRaw;
      }
    } else {
      const first = paramsRaw.slice(0, commaIdx).trim();
      const second = paramsRaw.slice(commaIdx + 1).trim();
      const destruct = splitSecondParamDestructured(second);
      if (destruct) {
        outerParams = `${first}, routeCtx: ${destruct.type}`;
        innerParams = outerParams;
        prelude = `const ${destruct.binding} = routeCtx;\n`;
        fourth = ", routeCtx";
      } else {
        outerParams = paramsRaw;
        innerParams = paramsRaw;
        const id = second.split(":")[0].trim();
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(id)) fourth = `, ${id}`;
      }
    }

    const traceReq = firstBindingName(outerParams.split(",")[0].trim());

    const newFn = `export async function ${method}(${outerParams}) {\n  return withApiTrace(${traceReq}, "${routeStr}", async (${innerParams}) => {\n${prelude}${innerBody}\n  }${fourth});\n}`;

    replacements.push({ start: m.index, end: braceClose + 1, text: newFn });
  }

  replacements.sort((a, b) => b.start - a.start);
  let out = src;
  for (const r of replacements) {
    out = out.slice(0, r.start) + r.text + out.slice(r.end);
  }

  const preludeImports = [];
  if (!out.includes("@/lib/trace")) preludeImports.push(`import { withApiTrace } from "@/lib/trace";`);
  if (/\bNextRequest\b/.test(out)) {
    const hasNamed = /\{[^}]*\bNextRequest\b[^}]*\}\s*from\s*["']next\/server["']/.test(out);
    const hasTypeImport = /import\s+type\s*\{[^}]*NextRequest/.test(out);
    if (!hasNamed && !hasTypeImport) {
      preludeImports.push(`import type { NextRequest } from "next/server";`);
    }
  }

  if (preludeImports.length) {
    const firstImport = out.search(/^import\s/gm);
    if (firstImport === -1) out = `${preludeImports.join("\n")}\n${out}`;
    else out = out.slice(0, firstImport) + `${preludeImports.join("\n")}\n` + out.slice(firstImport);
  }

  return out;
}

function main() {
  const routes = walkRoutes(API);
  let changed = 0;
  for (const file of routes) {
    const text = fs.readFileSync(file, "utf8");
    const out = transformFile(text, routeLiteral(file));
    if (out !== text) {
      fs.writeFileSync(file, out, "utf8");
      changed++;
      console.log("wrapped", path.relative(ROOT, file));
    }
  }
  console.log(`Done. Updated ${changed} files.`);
}

main();
