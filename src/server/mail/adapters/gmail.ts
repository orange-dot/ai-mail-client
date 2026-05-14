import type { ComposePayload, EmailMessage, MailAddress, MailLabel } from "@/lib/types";
import { buildMimeMessage, encodeBase64Url } from "../mime";
import type { MailProviderAdapter } from "./types";

type GmailHeader = { name: string; value: string };
type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string }; filename?: string }>;
  };
};

export class GmailAdapter implements MailProviderAdapter {
  provider = "gmail" as const;

  constructor(private readonly accountId: string, private readonly accessToken: string, private readonly from: MailAddress) {}

  async listMessages(options: { query?: string; label?: string; limit?: number } = {}): Promise<EmailMessage[]> {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("maxResults", String(options.limit ?? 25));
    if (options.query) url.searchParams.set("q", options.query);
    if (options.label) url.searchParams.set("labelIds", options.label);

    const list = await this.request<{ messages?: Array<{ id: string }> }>(url.toString());
    const ids = list.messages?.map((message) => message.id) ?? [];

    return Promise.all(ids.map((id) => this.getMessage(id)));
  }

  async getMessage(id: string): Promise<EmailMessage> {
    const raw = await this.request<GmailMessage>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`
    );
    return normalizeGmailMessage(this.accountId, raw);
  }

  async send(payload: ComposePayload): Promise<{ providerMessageId: string }> {
    const mime = buildMimeMessage(payload, { from: this.from });
    const response = await this.request<{ id: string }>("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw: encodeBase64Url(mime) })
    });
    return { providerMessageId: response.id };
  }

  async reply(message: EmailMessage, payload: ComposePayload): Promise<{ providerMessageId: string }> {
    const mime = buildMimeMessage(payload, { from: this.from, replyTo: message });
    const response = await this.request<{ id: string }>("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw: encodeBase64Url(mime), threadId: message.threadId })
    });
    return { providerMessageId: response.id };
  }

  async forward(_message: EmailMessage, payload: ComposePayload): Promise<{ providerMessageId: string }> {
    return this.send(payload);
  }

  async archive(message: EmailMessage): Promise<void> {
    await this.modify(message.providerMessageId, { removeLabelIds: ["INBOX"] });
  }

  async delete(message: EmailMessage): Promise<void> {
    await this.request(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.providerMessageId}/trash`, {
      method: "POST"
    });
  }

  async applyLabel(message: EmailMessage, label: MailLabel): Promise<void> {
    await this.modify(message.providerMessageId, { addLabelIds: [label.id] });
  }

  async removeLabel(message: EmailMessage, label: MailLabel): Promise<void> {
    await this.modify(message.providerMessageId, { removeLabelIds: [label.id] });
  }

  private async modify(id: string, body: Record<string, string[]>): Promise<void> {
    await this.request(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
        ...init.headers
      }
    });

    if (!response.ok) throw new Error(`Gmail API ${response.status}`);
    return response.json() as Promise<T>;
  }
}

export function normalizeGmailMessage(accountId: string, raw: GmailMessage): EmailMessage {
  const headers = new Map((raw.payload?.headers ?? []).map((header) => [header.name.toLowerCase(), header.value]));
  const labels = raw.labelIds?.map((label) => label.toLowerCase()) ?? [];
  const bodyText = decodeGmailBody(raw);
  const receivedAt = raw.internalDate ? new Date(Number(raw.internalDate)).toISOString() : new Date().toISOString();

  return {
    id: `gmail:${raw.id}`,
    providerMessageId: raw.id,
    threadId: raw.threadId,
    accountId,
    provider: "gmail",
    subject: headers.get("subject") ?? "(no subject)",
    from: parseAddress(headers.get("from") ?? ""),
    to: splitAddresses(headers.get("to") ?? ""),
    receivedAt,
    snippet: raw.snippet ?? bodyText.slice(0, 160),
    bodyText,
    labels,
    flags: {
      unread: labels.includes("unread"),
      archived: !labels.includes("inbox"),
      deleted: labels.includes("trash")
    },
    priority: labels.includes("important") ? "high" : "normal"
  };
}

function decodeGmailBody(raw: GmailMessage): string {
  const direct = raw.payload?.body?.data;
  const textPart = raw.payload?.parts?.find((part) => part.mimeType === "text/plain" && part.body?.data);
  const data = direct ?? textPart?.body?.data;
  if (!data) return raw.snippet ?? "";
  return Buffer.from(data, "base64url").toString("utf8");
}

function parseAddress(value: string): MailAddress {
  const match = value.match(/^(?:"?([^"<]*)"?)?\s*<?([^<>@\s]+@[^<>\s]+)>?$/);
  if (!match) return { email: value || "unknown@example.invalid" };
  return { name: match[1]?.trim() || undefined, email: match[2] };
}

function splitAddresses(value: string): MailAddress[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseAddress);
}
