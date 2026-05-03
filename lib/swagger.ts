import fs from "fs";
import path from "path";
import swaggerJSDoc from "swagger-jsdoc";
import yaml from "js-yaml";

type OasDoc = Record<string, unknown>;

function deepMergePaths(a: OasDoc, b: OasDoc): OasDoc {
  const out = { ...a };
  const pathsA = (a.paths as Record<string, unknown>) ?? {};
  const pathsB = (b.paths as Record<string, unknown>) ?? {};
  out.paths = { ...pathsA, ...pathsB };
  return out;
}

/**
 * swagger-jsdoc scans JSDoc @openapi / @swagger blocks in API route files.
 * Generated paths from filesystem are merged from openapi/openapi.generated.yaml when present.
 */
export function getOpenApiDocument(): OasDoc {
  const basePath = path.join(process.cwd(), "openapi", "openapi.yaml");
  const genPath = path.join(process.cwd(), "openapi", "openapi.generated.yaml");

  const baseRaw = fs.readFileSync(basePath, "utf8");
  const base = yaml.load(baseRaw) as OasDoc;

  let generated: OasDoc = {};
  if (fs.existsSync(genPath)) {
    generated = yaml.load(fs.readFileSync(genPath, "utf8")) as OasDoc;
  }

  const jsdocSpec = swaggerJSDoc({
    definition: {
      openapi: "3.0.0",
      info: { title: "JSDoc overlays", version: "1.0.0" },
      paths: {},
    },
    apis: ["./app/api/**/*.ts"],
  }) as OasDoc;

  let merged = deepMergePaths(base, generated);
  merged = deepMergePaths(merged, jsdocSpec);
  merged.info = {
    ...(typeof merged.info === "object" && merged.info !== null ? merged.info : {}),
    title: "App API",
    version: "1.0.0",
  };
  return merged;
}

export function getOpenApiYaml(): string {
  return yaml.dump(getOpenApiDocument(), { lineWidth: -1 });
}
