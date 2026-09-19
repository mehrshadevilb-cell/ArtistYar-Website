"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Lightweight RTL-friendly Markdown renderer for AI assistant replies.
 * Supports: headings, paragraphs, bold/italic, inline code, fenced code,
 * unordered/ordered lists, links, horizontal rules. No external deps.
 */
export function MarkdownContent({ text }: { text: string }) {
  if (!text?.trim()) return null;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing ```
      blocks.push(
        <pre
          key={key++}
          className="my-3 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0c0c0b] px-4 py-3 text-[12.5px] leading-6 text-sand-100"
          dir="ltr"
        >
          <code className={lang ? `language-${lang}` : undefined}>
            {codeLines.join("\n")}
          </code>
        </pre>
      );
      continue;
    }

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(
        <hr key={key++} className="my-4 border-0 border-t border-white/[0.1]" />
      );
      i += 1;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = inlineFormat(headingMatch[2]);
      const cls =
        level === 1
          ? "mt-4 mb-2 text-base font-semibold text-sand-50"
          : level === 2
            ? "mt-3.5 mb-1.5 text-[15px] font-semibold text-sand-50"
            : "mt-3 mb-1 text-sm font-semibold text-sand-100";
      const Tag = (`h${Math.min(level + 2, 6)}` as "h3" | "h4" | "h5" | "h6");
      blocks.push(
        <Tag key={key++} className={cls}>
          {content}
        </Tag>
      );
      i += 1;
      continue;
    }

    // Unordered list
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*•]\s+/, "");
        items.push(
          <li key={items.length} className="leading-7">
            {inlineFormat(itemText)}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ul
          key={key++}
          className="my-2 list-disc space-y-1.5 pr-5 text-[13.5px] text-ink-200 marker:text-gold-500/80"
        >
          {items}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+[.)]\s+/, "");
        items.push(
          <li key={items.length} className="leading-7">
            {inlineFormat(itemText)}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ol
          key={key++}
          className="my-2 list-decimal space-y-1.5 pr-5 text-[13.5px] text-ink-200 marker:text-gold-500/80"
        >
          {items}
        </ol>
      );
      continue;
    }

    // Empty line → skip
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trimStart().startsWith("```") &&
      !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    if (paraLines.length) {
      blocks.push(
        <p key={key++} className="my-1.5 text-[13.5px] leading-7 text-ink-200 first:mt-0 last:mb-0">
          {inlineFormat(paraLines.join(" "))}
        </p>
      );
    }
  }

  return <div className="assistant-md space-y-0.5">{blocks}</div>;
}

function inlineFormat(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let k = 0;

  const patterns: { re: RegExp; render: (m: RegExpMatchArray) => ReactNode }[] = [
    {
      re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/,
      render: (m) => (
        <a
          key={k++}
          href={m[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-400 underline decoration-gold-500/40 underline-offset-2 transition hover:text-gold-300"
        >
          {m[1]}
        </a>
      ),
    },
    {
      re: /`([^`]+)`/,
      render: (m) => (
        <code
          key={k++}
          className="rounded-md border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 text-[12px] text-gold-300"
          dir="ltr"
        >
          {m[1]}
        </code>
      ),
    },
    {
      re: /\*\*([^*]+)\*\*/,
      render: (m) => (
        <strong key={k++} className="font-semibold text-sand-50">
          {m[1]}
        </strong>
      ),
    },
    {
      re: /(?<!\*)\*([^*]+)\*(?!\*)/,
      render: (m) => (
        <em key={k++} className="italic text-ink-100">
          {m[1]}
        </em>
      ),
    },
  ];

  while (remaining.length) {
    let earliest: { index: number; match: RegExpMatchArray; render: (m: RegExpMatchArray) => ReactNode } | null = null;

    for (const p of patterns) {
      const m = remaining.match(p.re);
      if (m && m.index !== undefined) {
        if (!earliest || m.index < earliest.index) {
          earliest = { index: m.index, match: m, render: p.render };
        }
      }
    }

    if (!earliest) {
      parts.push(<Fragment key={k++}>{remaining}</Fragment>);
      break;
    }

    if (earliest.index > 0) {
      parts.push(<Fragment key={k++}>{remaining.slice(0, earliest.index)}</Fragment>);
    }
    parts.push(earliest.render(earliest.match));
    remaining = remaining.slice(earliest.index + earliest.match[0].length);
  }

  return <>{parts}</>;
}
