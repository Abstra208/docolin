// Fails if any tracked file contains an em dash (U+2014) or en dash (U+2013).
// Run via `bun run check:dashes`. Wired into `bun run check`.
// See CLAUDE.md "Punctuation" rule.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Defined via escape sequences so the rule-enforcer file itself stays clean.
const EM_DASH = "\u2014";
const EN_DASH = "\u2013";

// Lines that document the rule itself naturally include the forbidden characters.
function isAllowedException(line: string): boolean {
  return line.includes("Never use em dashes");
}

const filesOutput = execSync("git ls-files", { encoding: "utf-8" });
const files = filesOutput.split("\n").filter(Boolean);

const violations: string[] = [];

for (const file of files) {
  let content: string;
  try {
    content = readFileSync(file, "utf-8");
  } catch {
    continue;
  }
  if (!content.includes(EM_DASH) && !content.includes(EN_DASH)) continue;

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes(EM_DASH) && !line.includes(EN_DASH)) continue;
    if (isAllowedException(line)) continue;
    violations.push(`  ${file}:${(i + 1).toString()}: ${line.trim()}`);
  }
}

if (violations.length > 0) {
  console.error("Em or en dashes found (CLAUDE.md punctuation rule):");
  for (const v of violations) console.error(v);
  process.exit(1);
}
