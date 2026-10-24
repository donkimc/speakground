import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROMPT_ID = /^[a-z0-9-]+@\d+$/;

/** Load a versioned prompt such as `item-judge@1`. */
export function loadPrompt(id: string): string {
  if (!PROMPT_ID.test(id)) throw new Error(`Invalid prompt id "${id}".`);
  const path = join(dirname(fileURLToPath(import.meta.url)), "../prompts", `${id}.md`);
  return readFileSync(path, "utf8");
}
