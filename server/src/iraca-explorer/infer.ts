import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { makeHttpPath } from "@scifamek-open-source/iraca/web-api";

const EVENT_CALL = /\b([A-Z][A-Za-z0-9]*DomainEvent)\s*\(/g;
const PARAM_INTERFACE =
  /export\s+interface\s+\w*Param\s*\{([\s\S]*?)\}/;
const FIELD = /([A-Za-z_]\w*)\s*\??\s*:\s*([^;]+);/g;
const RELATIVE_IMPORT = /from\s+["'](\.[^"']+)["']/g;

export function extractDomainEvents(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(EVENT_CALL)) {
    const name = match[1];
    if (name && !found.includes(name)) {
      found.push(name);
    }
  }
  return found;
}

export function inferSampleFromParam(source: string): Record<string, unknown> | null {
  const block = source.match(PARAM_INTERFACE);
  if (!block) {
    return null;
  }
  const sample: Record<string, unknown> = {};
  for (const match of block[1].matchAll(FIELD)) {
    sample[match[1]] = placeholderForType(match[2]);
  }
  return Object.keys(sample).length ? sample : null;
}

export function inferUsecaseDocs(
  featureRoot: string,
  module: string,
  usecase: string,
): { events: string[]; sample: Record<string, unknown> | null } {
  const slug = makeHttpPath(usecase);
  const folder = join(featureRoot, module, "usecases");
  const impl = firstExisting(
    join(folder, `${slug}.usecase-impl.ts`),
    join(folder, `${slug}.usecase-impl.js`),
  );
  const abstraction = firstExisting(
    join(folder, `${slug}.usecase.ts`),
    join(folder, `${slug}.usecase.js`),
  );

  const events = new Set<string>();
  const visited = new Set<string>();
  if (impl) {
    collectEvents(impl, events, visited);
  }
  const sample = abstraction
    ? inferSampleFromParam(readFileSync(abstraction, "utf8"))
    : null;

  return { events: [...events], sample };
}

function collectEvents(
  file: string,
  events: Set<string>,
  visited: Set<string>,
): void {
  if (visited.has(file) || !existsSync(file)) {
    return;
  }
  visited.add(file);
  const source = readFileSync(file, "utf8");
  for (const name of extractDomainEvents(source)) {
    events.add(name);
  }
  const dir = dirname(file);
  for (const match of source.matchAll(RELATIVE_IMPORT)) {
    const raw = match[1];
    const resolved = firstExisting(`${join(dir, raw)}.ts`, `${join(dir, raw)}.js`);
    if (resolved) {
      collectEvents(resolved, events, visited);
    }
  }
}

function placeholderForType(raw: string): unknown {
  const type = raw.replace(/\s+/g, " ").trim();
  if (/\bnumber\b/.test(type)) return 0;
  if (/\bboolean\b/.test(type)) return false;
  if (/\bDate\b/.test(type)) return new Date().toISOString();
  return "";
}

function firstExisting(...paths: string[]): string | null {
  return paths.find((item) => existsSync(item)) ?? null;
}
