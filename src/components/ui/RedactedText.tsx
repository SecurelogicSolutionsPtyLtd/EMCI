import React from 'react';
import { SENSITIVE_TOKEN } from '../../redaction';
import { REDACTED_TOKEN } from '../../lib/studentRedaction';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const REDACTION_SPLIT = new RegExp(
  `(${escapeRegExp(SENSITIVE_TOKEN)}|${escapeRegExp(REDACTED_TOKEN)})`,
  'g',
);

function SensitiveRedactedPill() {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-orange-50 text-orange-700 border border-orange-200 align-middle whitespace-nowrap"
      title="Sensitive personal information removed"
      aria-label="Sensitive personal information redacted"
    >
      Redacted
    </span>
  );
}

/** Renders timeline/note text, replacing redaction tokens with styled pills. */
export function RedactedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;

  const parts = text.split(REDACTION_SPLIT);
  const hasRedaction = parts.some(
    part => part === SENSITIVE_TOKEN || part === REDACTED_TOKEN,
  );

  if (!hasRedaction) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part === SENSITIVE_TOKEN) {
          return <SensitiveRedactedPill key={i} />;
        }
        if (part === REDACTED_TOKEN) {
          return (
            <span
              key={i}
              className="text-slate-400 italic font-medium mx-0.5"
              aria-label="Personal identifier redacted"
            >
              {REDACTED_TOKEN}
            </span>
          );
        }
        return part ? <span key={i}>{part}</span> : null;
      })}
    </span>
  );
}
