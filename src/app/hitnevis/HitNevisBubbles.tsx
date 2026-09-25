"use client";

import type { ReactNode } from "react";
import { Check, Copy, Pencil, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import type { HitNevisMode } from "@/lib/hitnevis/intent";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: number;
  mode?: HitNevisMode;
  modeLabel?: string;
  kind?: "text" | "lyrics" | "analysis" | "error";
  directions?: string[];
  retryable?: boolean;
  lastPrompt?: string;
};

export function Bubble({
  msg,
  copied,
  loading,
  isEditing,
  onCopy,
  onUse,
  onAppend,
  onContinue,
  onComplete,
  onRewrite,
  onRegen,
  onRetry,
  onEdit,
  onDirection,
  onFeedback,
}: {
  msg: ChatMessage;
  copied: boolean;
  loading: boolean;
  isEditing?: boolean;
  onCopy: () => void;
  onUse: () => void;
  onAppend: () => void;
  onContinue: () => void;
  onComplete: () => void;
  onRewrite: () => void;
  onRegen: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onDirection: (d: string) => void;
  onFeedback: (signal: "positive" | "negative") => void;
}) {
  if (msg.role === "user") {
    return (
      <div className={`flex justify-end ${isEditing ? "opacity-60" : ""}`}>
        <div className="max-w-[85%] rounded-2xl rounded-ss-md bg-sand-100/95 px-3.5 py-2.5 text-sm leading-7 text-ink-950">
          <div className="whitespace-pre-wrap">{msg.content}</div>
          <div className="mt-1.5 flex justify-end gap-2">
            <A onClick={onEdit} disabled={loading}>
              <Pencil size={11} className="inline" /> ویرایش
            </A>
          </div>
        </div>
      </div>
    );
  }

  if (msg.role === "system") {
    return <div className="text-center text-xs leading-6 text-ink-500">{msg.content}</div>;
  }

  const isErr = msg.kind === "error";
  const isLyrics = msg.kind === "lyrics";

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-1.5">
        <div className="text-[10px] text-ink-500">هیت‌نویس</div>
        <div
          className={`rounded-2xl rounded-se-md px-3.5 py-2.5 text-sm leading-7 ${
            isErr
              ? "border border-red-900/40 bg-red-950/30 text-red-100/90"
              : "bg-ink-900/50 text-sand-50"
          }`}
        >
          <pre className="whitespace-pre-wrap font-sans" dir="auto">
            {msg.content}
          </pre>
        </div>
        {msg.directions && msg.directions.length > 0 && (
          <div className="space-y-1.5">
            {msg.directions.map((d, i) => (
              <button
                key={i}
                type="button"
                disabled={loading}
                onClick={() => onDirection(d)}
                className="block w-full rounded-xl border border-ink-800/80 px-3 py-2 text-start text-xs leading-6 text-ink-300 hover:border-ink-600 hover:text-sand-100"
              >
                {d.slice(0, 360)}
                {d.length > 360 ? "…" : ""}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-0.5">
          {!isErr && (
            <>
              <A onClick={onCopy}>
                {copied ? (
                  <>
                    <Check size={11} className="inline" /> کپی شد
                  </>
                ) : (
                  <>
                    <Copy size={11} className="inline" /> کپی
                  </>
                )}
              </A>
              {(isLyrics || msg.directions) && (
                <>
                  <A onClick={onUse}>جایگزین کردن بخش</A>
                  <A onClick={onAppend}>افزودن به بخش</A>
                  <A onClick={onContinue} disabled={loading}>
                    ادامه
                  </A>
                  <A onClick={onComplete} disabled={loading}>
                    تکمیل
                  </A>
                  <A onClick={onRewrite} disabled={loading}>
                    بازنویسی
                  </A>
                </>
              )}
              {!isErr && msg.kind !== "analysis" && (
                <>
                  <A onClick={() => onFeedback("positive")}><ThumbsUp size={11} className="inline" /> مفید بود</A>
                  <A onClick={() => onFeedback("negative")}><ThumbsDown size={11} className="inline" /> نیاز به بهتر شدن داشت</A>
                </>
              )}
          {msg.lastPrompt && (
                <A onClick={onRegen} disabled={loading}>
                  <RefreshCw size={11} className="inline" /> دوباره
                </A>
              )}
            </>
          )}
          {isErr && msg.retryable && (
            <A onClick={onRetry} disabled={loading}>
              <RefreshCw size={11} className="inline" /> تلاش دوباره
            </A>
          )}
        </div>
      </div>
    </div>
  );
}

function A({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="text-[11px] opacity-70 transition hover:opacity-100 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
