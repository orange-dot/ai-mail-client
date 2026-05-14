import type { EmailMessage, MailPriority } from "@/lib/types";

const urgentWords = ["urgent", "asap", "today", "deadline", "before", "blocked", "production", "security"];
const actionWords = ["please", "can you", "review", "send", "confirm", "approve", "reply"];

export function scorePriority(message: Pick<EmailMessage, "subject" | "snippet" | "bodyText" | "flags" | "labels" | "receivedAt">): {
  priority: MailPriority;
  rationale: string;
} {
  const text = `${message.subject} ${message.snippet} ${message.bodyText}`.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (message.flags.unread) {
    score += 1;
    reasons.push("unread");
  }

  if (urgentWords.some((word) => text.includes(word))) {
    score += 3;
    reasons.push("deadline or urgency language");
  }

  if (actionWords.some((word) => text.includes(word))) {
    score += 2;
    reasons.push("direct action request");
  }

  if (message.labels.includes("priority") || message.labels.includes("important")) {
    score += 2;
    reasons.push("priority label");
  }

  const ageHours = (Date.now() - Date.parse(message.receivedAt)) / 3_600_000;
  if (ageHours < 8) {
    score += 1;
    reasons.push("recent");
  }

  if (score >= 6) return { priority: "urgent", rationale: reasons.join(", ") };
  if (score >= 4) return { priority: "high", rationale: reasons.join(", ") };
  if (score <= 0) return { priority: "low", rationale: "no deadline or direct action signal" };
  return { priority: "normal", rationale: reasons.join(", ") || "standard inbox message" };
}
