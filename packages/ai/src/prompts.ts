import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROMPT_ID = /^[a-z0-9-]+@\d+$/;

/**
 * Load a versioned prompt such as `item-judge@1`.
 * Source, the repo root, and the app directory are all valid places to run.
 */
export function loadPrompt(id: string): string {
  if (!PROMPT_ID.test(id)) throw new Error(`Invalid prompt id "${id}".`);
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../prompts", `${id}.md`),
    join(process.cwd(), "packages/ai/prompts", `${id}.md`),
    join(process.cwd(), "../../packages/ai/prompts", `${id}.md`),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, "utf8");
    } catch {
      continue;
    }
  }
  throw new Error(`Missing prompt ${id}.`);
}
