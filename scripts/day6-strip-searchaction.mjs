/**
 * Day 6: remove misleading WebSite SearchAction from src/app/layout.tsx.
 * Safe no-op if already removed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/app/layout.tsx");
let src = readFileSync(target, "utf8");

if (!src.includes("potentialAction") && !src.includes('"@type": "SearchAction"')) {
  console.log("SearchAction already absent");
  process.exit(0);
}

const re = /\n  potentialAction: \{\n    "@type": "SearchAction",\n    target: \{\n      "@type": "EntryPoint",\n      urlTemplate: `\$\{siteUrl\}\/courses\?q=\{search_term_string\}`,\n    \},\n    "query-input": "required name=search_term_string",\n  \},/;

if (!re.test(src)) {
  // Fallback: remove any potentialAction block inside websiteJsonLd region
  const start = src.indexOf("const websiteJsonLd");
  const end = src.indexOf("export const metadata", start);
  if (start < 0 || end < 0) {
    console.error("could not locate websiteJsonLd");
    process.exit(1);
  }
  let block = src.slice(start, end);
  block = block.replace(/\n  potentialAction: \{[\s\S]*?\n  \},/, "");
  if (block.includes("potentialAction") || block.includes("SearchAction")) {
    // still present — force strip lines
    block = block
      .split("\n")
      .filter((line) => !/potentialAction|SearchAction|urlTemplate|query-input|EntryPoint/.test(line))
      .join("\n");
  }
  if (!block.includes("// SearchAction omitted")) {
    block = block.replace(
      'inLanguage: "fa-IR",',
      'inLanguage: "fa-IR",\n  // SearchAction omitted: /courses does not implement ?q= search.\n  // Advertising SearchAction without matching UI is misleading structured data.',
    );
  }
  src = src.slice(0, start) + block + src.slice(end);
} else {
  src = src.replace(
    re,
    '\n  // SearchAction omitted: /courses does not implement ?q= search.\n  // Advertising SearchAction without matching UI is misleading structured data.',
  );
}

if (src.includes("potentialAction") || src.includes('"@type": "SearchAction"')) {
  console.error("strip failed; SearchAction still present");
  process.exit(1);
}

writeFileSync(target, src);
console.log("stripped SearchAction from layout.tsx");
