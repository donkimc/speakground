import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createGroqProvider, type Item, loadPrompt } from "@fluentloop/ai";
import { z } from "zod";

import { checkSchema, runChecks } from "./checks";
import {
  checksFromJudgement,
  itemJudgeInput,
  itemJudgeSchema,
  mcqSolveInput,
  mcqSolveSchema,
  summarizeJudge,
} from "./judge";

/**
 * Model-judged evals for the gold set. CI keeps running the deterministic
 * checks without a key. This command calls Groq.
 */
loadLocalEnv();

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1),
  GROQ_FAST_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),
  GROQ_STRONG_MODEL: z.string().min(1).default("openai/gpt-oss-120b"),
});

const env = envSchema.safeParse(process.env);
if (!env.success) {
  console.error("GROQ_API_KEY is required. Add it to .env, then run pnpm evals:groq.");
  process.exit(1);
}

const provider = createGroqProvider({
  apiKey: env.data.GROQ_API_KEY,
  fastModel: env.data.GROQ_FAST_MODEL,
  strongModel: env.data.GROQ_STRONG_MODEL,
});
const solvePrompt = loadPrompt("mcq-solve@1");
const judgePrompt = loadPrompt("item-judge@1");
const goldDir = fileURLToPath(new URL("../gold", import.meta.url));

let deterministicFailures = 0;
const judged = [];
let inputTokens = 0;
let outputTokens = 0;

for (const file of readdirSync(goldDir).filter((name) => name.endsWith(".json"))) {
  const items: unknown[] = JSON.parse(readFileSync(join(goldDir, file), "utf8"));
  for (const [index, raw] of items.entries()) {
    const id = `${file}#${index}`;
    const parsed = checkSchema(raw);
    const failed = runChecks(raw).filter((check) => !check.passed);
    if (!parsed.item || failed.length > 0) {
      deterministicFailures += 1;
      for (const check of failed) {
        console.error(`FAIL ${id} ${check.check}${check.detail ? `: ${check.detail}` : ""}`);
      }
      continue;
    }
    const item: Item = parsed.item;
    const solvePayload = mcqSolveInput(item);
    const solve = solvePayload
      ? await provider.generateStructured({
          tier: "strong",
          promptId: "mcq-solve@1",
          system: solvePrompt,
          input: solvePayload,
          schema: mcqSolveSchema,
        })
      : undefined;
    const judgement = await provider.generateStructured({
      tier: "strong",
      promptId: "item-judge@1",
      system: judgePrompt,
      input: itemJudgeInput(item),
      schema: itemJudgeSchema,
    });
    inputTokens += (solve?.usage.inputTokens ?? 0) + judgement.usage.inputTokens;
    outputTokens += (solve?.usage.outputTokens ?? 0) + judgement.usage.outputTokens;
    const checks = checksFromJudgement(item, solve?.data, judgement.data);
    judged.push(checks);
    for (const check of checks.filter((row) => !row.passed)) {
      console.error(`FAIL ${id} ${check.check}${check.detail ? `: ${check.detail}` : ""}`);
    }
  }
}

const summary = summarizeJudge(judged);
for (const row of summary) {
  const rate = `${row.passed}/${row.total}`;
  console.info(
    `${row.ok ? "PASS" : "FAIL"} ${row.check} ${rate} (bar ${(row.bar * 100).toFixed(0)}%)`,
  );
}
console.info(
  JSON.stringify({
    model: env.data.GROQ_STRONG_MODEL,
    inputTokens,
    outputTokens,
    deterministicFailures,
  }),
);
console.info("E8 writing feedback: no gold set yet");

const failedBars = summary.filter((row) => !row.ok).length;
if (deterministicFailures > 0 || failedBars > 0 || judged.length === 0) process.exit(1);

function loadLocalEnv() {
  const path = resolve(fileURLToPath(new URL("../../..", import.meta.url)), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
