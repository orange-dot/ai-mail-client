import type { AiDraftRequest, AiDraftResponse, EmailMessage } from "@/lib/types";
import { scorePriority } from "./priority";
import { buildFallbackSummary } from "./summary-fallback";

const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

// The API key is resolved by the caller (per-session BYO value, then server
// env). When it is absent the deterministic fallback path runs — its output is
// structurally identical to the model path, so the UI cannot tell them apart.
export async function summarizeMessage(message: EmailMessage, apiKey?: string): Promise<string> {
  if (!apiKey) {
    return buildFallbackSummary(message);
  }

  const text = await callAnthropic(
    `Summarize this email in one or two concise sentences. Identify the sender's intent, the specific action requested, and any deadline. If no action or deadline is present, say so briefly.\n\nSubject: ${message.subject}\nFrom: ${message.from.email}\nBody:\n${message.bodyText.slice(0, 6000)}`,
    apiKey
  );
  return text.trim();
}

export async function draftReply(request: AiDraftRequest, apiKey?: string): Promise<AiDraftResponse> {
  if (!apiKey) {
    return fallbackDraft(request);
  }

  const bodyText = await callAnthropic(
    `Draft a ${request.tone} email reply. Do not invent facts. Keep it under 140 words.\n` +
      `User instruction: ${request.instruction ?? "Respond helpfully."}\n\n` +
      `Original subject: ${request.message.subject}\n` +
      `Original sender: ${request.message.from.email}\n` +
      `Original body:\n${request.message.bodyText.slice(0, 6000)}`,
    apiKey
  );

  return {
    subject: request.message.subject.toLowerCase().startsWith("re:")
      ? request.message.subject
      : `Re: ${request.message.subject}`,
    bodyText: bodyText.trim()
  };
}

export async function prioritizeMessages(messages: EmailMessage[]): Promise<EmailMessage[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return messages.map((message) => {
      const scored = scorePriority(message);
      return { ...message, priority: scored.priority, aiRationale: scored.rationale };
    });
  }

  return messages.map((message) => {
    const scored = scorePriority(message);
    return { ...message, priority: scored.priority, aiRationale: scored.rationale };
  });
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status}`);
  }

  const payload = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  return payload.content?.find((part) => part.type === "text")?.text ?? "";
}

function fallbackDraft(request: AiDraftRequest): AiDraftResponse {
  const greeting = request.message.from.name?.split(" ")[0] ?? "there";
  return {
    subject: request.message.subject.toLowerCase().startsWith("re:")
      ? request.message.subject
      : `Re: ${request.message.subject}`,
    bodyText:
      request.tone === "formal"
        ? `Hi ${greeting},\n\nThank you for the note. I will review this and follow up with the requested details.\n\nRegards,\nBojan`
        : `Hi ${greeting},\n\nThanks for the note. I will review this and send the requested details shortly.\n\nBojan`
  };
}
