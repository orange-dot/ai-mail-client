import type { ComposePayload, EmailMessage, MailAddress, MailLabel } from "@/lib/types";
import { buildMimeMessage, encodeBase64Url } from "../mime";
import type { MailProviderAdapter } from "./types";

type GmailHeader = { name: string; value: string };

type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPart[];
};

type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
};

export class GmailAdapter implements MailProviderAdapter {
  provider = "gmail" as const;

  constructor(
    private readonly accountId: string,
    private accessToken: string,
    private readonly from: MailAddress,
    private readonly refreshAccessToken?: () => Promise<string>
  ) {}

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
    let response = await this.authedFetch(url, init);

    // One refresh-and-retry on a 401: the access token has most likely expired.
    // The refresh callback owns decrypting the refresh token and persisting the
    // rotated credential; it never returns or logs token material. A single
    // retry only — a second 401 falls through to the throw below.
    if (response.status === 401 && this.refreshAccessToken) {
      this.accessToken = await this.refreshAccessToken();
      response = await this.authedFetch(url, init);
    }

    if (!response.ok) throw new Error(`Gmail API ${response.status}`);
    return response.json() as Promise<T>;
  }

  private authedFetch(url: string, init: RequestInit): Promise<Response> {
    return fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
        ...init.headers
      }
    });
  }
}

export function normalizeGmailMessage(accountId: string, raw: GmailMessage): EmailMessage {
  const headers = new Map((raw.payload?.headers ?? []).map((header) => [header.name.toLowerCase(), header.value]));
  // Gmail label IDs are case-sensitive opaque tokens (INBOX, UNREAD, TRASH,
  // IMPORTANT, Label_123). They are stored verbatim so they round-trip through
  // applyLabel/removeLabel, which send label.id straight to the Gmail API.
  const labels = raw.labelIds ?? [];
  const { bodyText, bodyHtml } = decodeGmailContent(raw);
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
    bodyHtml,
    labels,
    flags: {
      unread: labels.includes("UNREAD"),
      archived: !labels.includes("INBOX"),
      deleted: labels.includes("TRASH")
    },
    priority: labels.includes("IMPORTANT") ? "high" : "normal"
  };
}

// Walks the MIME tree. Gmail nests text/plain and text/html parts inside
// multipart/alternative, often under an outer multipart/mixed. Prefers a
// plain-text part at any depth; falls back to a tag-stripped HTML part, then
// the direct (non-multipart) payload body, then the snippet.
function decodeGmailContent(raw: GmailMessage): { bodyText: string; bodyHtml?: string } {
  const htmlPart = findPart(raw.payload, "text/html");
  const plainPart = findPart(raw.payload, "text/plain");
  const bodyHtml = htmlPart ? decodePartData(htmlPart) : undefined;

  let bodyText = plainPart ? decodePartData(plainPart) ?? "" : "";
  if (!bodyText && bodyHtml) bodyText = htmlToText(bodyHtml);
  if (!bodyText) {
    const direct = raw.payload?.body?.data;
    bodyText = direct ? Buffer.from(direct, "base64url").toString("utf8") : raw.snippet ?? "";
  }

  return { bodyText, bodyHtml };
}

function findPart(part: GmailPart | undefined, mimeType: string): GmailPart | undefined {
  if (!part) return undefined;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return undefined;
}

function decodePartData(part: GmailPart): string | undefined {
  const data = part.body?.data;
  return data ? Buffer.from(data, "base64url").toString("utf8") : undefined;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAddress(value: string): MailAddress {
  const match = value.match(/^(?:"?([^"<]*)"?)?\s*<?([^<>@\s]+@[^<>\s]+)>?$/);
  if (!match) return { email: value || "unknown@example.invalid" };
  const name = match[1]?.trim();
  // RFC 2047 encoded-word display names (=?UTF-8?B?...?=) are dropped rather
  // than shown raw; decoding them correctly needs charset-aware MIME handling.
  return { name: name && !isEncodedWord(name) ? name : undefined, email: match[2] };
}

function isEncodedWord(value: string): boolean {
  return /=\?[^?]+\?[BQbq]\?[^?]*\?=/.test(value);
}

function splitAddresses(value: string): MailAddress[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseAddress);
}
