/**
 * VMB Placeholder Hunter
 *
 * Scans likely user-facing VMB source files for placeholder copy.
 */
import fs from "node:fs/promises";
import path from "node:path";

type Finding = {
  file: string;
  component: string;
  route: string;
  line: number;
  text: string;
  term: string;
  severity: "Low" | "Medium" | "High";
};

const ROOT = process.cwd();
const SEARCH_ROOTS = ["app/vmb", "components/vmb", "lib/vmb"];
const EXTENSIONS = new Set([".js", ".jsx", ".json", ".ts", ".tsx"]);
const IGNORED_PARTS = [
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}fixtures${path.sep}`,
  `${path.sep}docs${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.next${path.sep}`,
];
const IGNORED_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/i,
  /\.spec\.[jt]sx?$/i,
  /scripts[\\/](test|debug|repair)-/i,
  /README|CHANGELOG|\.md$/i,
];

const TERMS: Array<{ label: string; pattern: RegExp }> = [
  { label: "coming soon", pattern: /\bcoming soon\b/i },
  { label: "placeholder", pattern: /\bplaceholder\b/i },
  { label: "TODO", pattern: /\bTODO\b/i },
  { label: "TBD", pattern: /\bTBD\b/i },
  { label: "lorem ipsum", pattern: /\blorem ipsum\b/i },
  { label: "service photo", pattern: /\bservice photo\b/i },
  { label: "salon photo", pattern: /\bsalon photo\b/i },
  { label: "dummy", pattern: /\bdummy\b/i },
  { label: "sample", pattern: /\bsample\b/i },
  { label: "temp", pattern: /\btemp\b/i },
  { label: "?", pattern: /(["'`])\?\1/ },
];

function ignoreFile(file: string): boolean {
  const normalized = path.normalize(file);
  return (
    IGNORED_PARTS.some((part) => normalized.includes(part)) ||
    IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    !EXTENSIONS.has(path.extname(file))
  );
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (ignoreFile(full)) continue;
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function stripInlineComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length - 1; i += 1) {
    const ch = line[i];
    if ((ch === `"` || ch === "'" || ch === "`") && line[i - 1] !== "\\") {
      quote = quote === ch ? null : quote ?? ch;
    }
    if (!quote && ch === "/" && line[i + 1] === "/") return line.slice(0, i);
  }
  return line;
}

function visibleSnippets(line: string): string[] {
  const snippets: string[] = [];
  const stringMatches = line.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g);
  for (const match of stringMatches) {
    const value = match[2].trim();
    if (!value) continue;
    if (value.startsWith("@/") || value.startsWith("../") || value.startsWith("./")) continue;
    if (/^(?:[a-z0-9_-]+|\/[a-z0-9?=&/_-]+)$/i.test(value)) continue;
    snippets.push(value);
  }

  const jsxTextMatches = line.matchAll(/>([^<>{}]+)</g);
  for (const match of jsxTextMatches) {
    const value = match[1].replace(/\s+/g, " ").trim();
    if (value) snippets.push(value);
  }

  return snippets;
}

function componentName(text: string, lineIndex: number, fallback: string): string {
  const prior = text.split(/\r?\n/).slice(Math.max(0, lineIndex - 80), lineIndex + 1).join("\n");
  const matches = [...prior.matchAll(/(?:function|const)\s+([A-Z][A-Za-z0-9_]*)/g)];
  return matches.at(-1)?.[1] ?? fallback;
}

function routeFor(file: string): string {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (!rel.startsWith("app/")) return "unknown";
  const route = rel
    .replace(/^app\/(?:\([^)]*\)\/)*/g, "/")
    .replace(/\/page\.[jt]sx?$/i, "")
    .replace(/\/route\.[jt]s$/i, "")
    .replace(/\/\([^)]*\)/g, "")
    .replace(/\/index$/i, "");
  return route === "" ? "/" : route;
}

function classify(file: string, term: string): Finding["severity"] {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (/^(app\/vmb|components\/vmb)\//.test(rel) && /coming soon|placeholder|TODO|TBD|lorem ipsum|dummy|temp/i.test(term)) {
    return "High";
  }
  if (/^(app\/vmb|components\/vmb|lib\/vmb)\//.test(rel)) return "Medium";
  return "Low";
}

async function run(): Promise<void> {
  const files = (await Promise.all(SEARCH_ROOTS.map((root) => collectFiles(path.join(ROOT, root))))).flat();
  const findings: Finding[] = [];

  for (const file of files) {
    const text = await fs.readFile(file, "utf8").catch(() => "");
    const lines = text.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/);
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");

    lines.forEach((raw, index) => {
      const line = stripInlineComment(raw);
      if (!line.trim()) return;
      const snippets = visibleSnippets(line);
      if (snippets.length === 0) return;
      for (const term of TERMS) {
        for (const snippet of snippets) {
          if (!term.pattern.test(snippet)) continue;
          findings.push({
            file: rel,
            component: componentName(text, index, path.basename(file)),
            route: routeFor(file),
            line: index + 1,
            text: snippet.slice(0, 220),
            term: term.label,
            severity: classify(file, term.label),
          });
        }
      }
    });
  }

  console.log("File | Component | Route | Line | Severity | Visible user text");
  console.log("--- | --- | --- | --- | --- | ---");
  for (const finding of findings) {
    console.log(
      `${finding.file} | ${finding.component} | ${finding.route} | ${finding.line} | ${finding.severity} | ${finding.text}`,
    );
  }

  const high = findings.filter((finding) => finding.severity === "High");
  console.log(`\nSummary: ${findings.length} findings (${high.length} High).`);

  if (high.length > 0) {
    process.exit(1);
  }
}

void run().catch((err) => {
  console.error("FAIL: VMB Placeholder Hunter crashed");
  console.error(err);
  process.exit(1);
});
