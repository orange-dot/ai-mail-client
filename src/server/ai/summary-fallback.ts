import type { EmailMessage } from "@/lib/types";

// Word arrays intentionally duplicated from priority.ts.
// Rationale: keeping a copy here removes any risk of changing scorePriority output
// during this cooperation. If/when a shared language-signals module is introduced,
// both files can import from it without altering the byte order or contents of these arrays.
const URGENT_WORDS = [
  "urgent",
  "asap",
  "today",
  "deadline",
  "before",
  "blocked",
  "production",
  "security"
];

const ACTION_WORDS = ["please", "can you", "review", "send", "confirm", "approve", "reply"];

const MAX_SUMMARY_CHARS = 240;

// Matches explicit deadline phrases like "before 15:00", "by Friday", "by 2026-05-15",
// "by tomorrow", "today at 3pm", "deadline 17:00". Case-insensitive, global so we can
// pick the most informative match. The capture group preserves the verbatim tail so the
// fallback summary can quote it.
const DEADLINE_PATTERN =
  /\b(?:by the end of|no later than|today at|tomorrow at|by|before|due|deadline|eod|eob)\s+([^.,;!?\n]{1,40})/gi;
const TIME_ONLY_PATTERN = /\b(\d{1,2}:\d{2}(?:\s?(?:am|pm))?)/i;
const DIGIT_OR_DAY_PATTERN = /\d|mon|tue|wed|thu|fri|sat|sun/i;

export function detectAction(text: string): string | null {
  const lower = text.toLowerCase();
  for (const word of ACTION_WORDS) {
    if (lower.includes(word)) return word;
  }
  return null;
}

export function detectDeadline(text: string): string | null {
  const matches = Array.from(text.matchAll(DEADLINE_PATTERN));
  if (matches.length > 0) {
    // Prefer a match whose tail contains a digit or weekday — that's a real deadline,
    // not just "deadline today" with a vague qualifier. Fall back to the first match
    // if nothing more specific is found.
    const specific = matches.find((m) => m[1] && DIGIT_OR_DAY_PATTERN.test(m[1]));
    const chosen = specific ?? matches[0];
    return `${chosen[0]}`.trim();
  }
  // Last-resort: a bare time of day in the body (e.g. "Please review at 15:00") still
  // counts as a deadline signal when the message also has urgent-word context.
  const lower = text.toLowerCase();
  const hasUrgentContext = URGENT_WORDS.some((word) => lower.includes(word));
  if (hasUrgentContext) {
    const timeMatch = text.match(TIME_ONLY_PATTERN);
    if (timeMatch && timeMatch[1]) return timeMatch[1].trim();
  }
  return null;
}

export function buildFallbackSummary(message: EmailMessage): string {
  const sender = message.from.name?.trim() || message.from.email;
  const haystack = `${message.subject}\n${message.snippet}\n${message.bodyText}`;
  const action = detectAction(haystack);
  const deadline = detectDeadline(haystack);

  const parts: string[] = [];

  if (action) {
    parts.push(`${sender} is asking to ${action}`);
  } else {
    parts.push(`${sender} wrote about "${message.subject}"`);
  }

  if (deadline) {
    parts.push(`deadline: ${deadline}`);
  }

  if (!action) {
    const snippetClause = firstClause(message.snippet || message.bodyText);
    if (snippetClause) {
      parts.push(snippetClause);
    }
  } else if (!deadline) {
    const snippetClause = firstClause(message.snippet || message.bodyText);
    if (snippetClause) {
      parts.push(snippetClause);
    }
  }

  const composed = parts.join(" — ").replace(/\s+/g, " ").trim();
  if (composed.length <= MAX_SUMMARY_CHARS) return composed;
  return `${composed.slice(0, MAX_SUMMARY_CHARS - 1).trimEnd()}…`;
}

function firstClause(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  const match = trimmed.match(/^[^.!?\n]{1,160}/);
  return (match ? match[0] : trimmed.slice(0, 160)).trim();
}
