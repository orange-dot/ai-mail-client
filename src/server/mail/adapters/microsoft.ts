import type { ComposePayload, EmailMessage, MailAddress, MailLabel } from "@/lib/types";
import type { MailProviderAdapter } from "./types";

type GraphRecipient = { emailAddress: { name?: string; address: string } };
type GraphMessage = {
  id: string;
  conversationId: string;
  subject?: string;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  receivedDateTime: string;
  bodyPreview?: string;
  body?: { contentType: string; content: string };
  categories?: string[];
  isRead?: boolean;
  importance?: "low" | "normal" | "high";
};

export class MicrosoftAdapter implements MailProviderAdapter {
  provider = "microsoft365" as const;

  constructor(private readonly accountId: string, private readonly accessToken: string) {}

  async listMessages(options: { query?: string; label?: string; limit?: number } = {}): Promise<EmailMessage[]> {
    const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
    url.searchParams.set("$top", String(options.limit ?? 25));
    url.searchParams.set("$orderby", "receivedDateTime desc");
    if (options.query) url.searchParams.set("$search", `"${options.query.replaceAll('"', "")}"`);

    const label = options.label;
    const response = await this.request<{ value: GraphMessage[] }>(url.toString());
    const messages = response.value.map((message) => normalizeMicrosoftMessage(this.accountId, message));
    return label ? messages.filter((message) => message.labels.includes(label)) : messages;
  }

  async getMessage(id: string): Promise<EmailMessage> {
    const raw = await this.request<GraphMessage>(`https://graph.microsoft.com/v1.0/me/messages/${id}`);
    return normalizeMicrosoftMessage(this.accountId, raw);
  }

  async send(payload: ComposePayload): Promise<{ providerMessageId: string }> {
    await this.request("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      body: JSON.stringify({ message: graphMessageFromCompose(payload), saveToSentItems: true })
    });
    return { providerMessageId: crypto.randomUUID() };
  }

  async reply(message: EmailMessage, payload: ComposePayload): Promise<{ providerMessageId: string }> {
    await this.request(`https://graph.microsoft.com/v1.0/me/messages/${message.providerMessageId}/reply`, {
      method: "POST",
      body: JSON.stringify({ comment: payload.bodyText })
    });
    return { providerMessageId: crypto.randomUUID() };
  }

  async forward(message: EmailMessage, payload: ComposePayload): Promise<{ providerMessageId: string }> {
    await this.request(`https://graph.microsoft.com/v1.0/me/messages/${message.providerMessageId}/forward`, {
      method: "POST",
      body: JSON.stringify({
        comment: payload.bodyText,
        toRecipients: payload.to.map(toGraphRecipient)
      })
    });
    return { providerMessageId: crypto.randomUUID() };
  }

  async archive(message: EmailMessage): Promise<void> {
    await this.request(`https://graph.microsoft.com/v1.0/me/messages/${message.providerMessageId}/move`, {
      method: "POST",
      body: JSON.stringify({ destinationId: "archive" })
    });
  }

  async delete(message: EmailMessage): Promise<void> {
    await this.request(`https://graph.microsoft.com/v1.0/me/messages/${message.providerMessageId}`, {
      method: "DELETE"
    });
  }

  async applyLabel(message: EmailMessage, label: MailLabel): Promise<void> {
    await this.patchCategories(message, Array.from(new Set([...message.labels, label.name])));
  }

  async removeLabel(message: EmailMessage, label: MailLabel): Promise<void> {
    await this.patchCategories(message, message.labels.filter((name) => name !== label.name && name !== label.id));
  }

  private async patchCategories(message: EmailMessage, categories: string[]): Promise<void> {
    await this.request(`https://graph.microsoft.com/v1.0/me/messages/${message.providerMessageId}`, {
      method: "PATCH",
      body: JSON.stringify({ categories })
    });
  }

  private async request<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
        ConsistencyLevel: "eventual",
        ...init.headers
      }
    });

    if (!response.ok) throw new Error(`Microsoft Graph ${response.status}`);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}

export function normalizeMicrosoftMessage(accountId: string, raw: GraphMessage): EmailMessage {
  const labels = raw.categories ?? [];
  return {
    id: `microsoft365:${raw.id}`,
    providerMessageId: raw.id,
    threadId: raw.conversationId,
    accountId,
    provider: "microsoft365",
    subject: raw.subject ?? "(no subject)",
    from: graphAddress(raw.from),
    to: raw.toRecipients?.map(graphAddress) ?? [],
    cc: raw.ccRecipients?.map(graphAddress),
    receivedAt: raw.receivedDateTime,
    snippet: raw.bodyPreview ?? "",
    bodyText: stripHtml(raw.body?.content ?? raw.bodyPreview ?? ""),
    bodyHtml: raw.body?.contentType === "html" ? raw.body.content : undefined,
    labels,
    flags: {
      unread: raw.isRead === false,
      archived: false,
      deleted: false
    },
    priority: raw.importance === "high" ? "high" : raw.importance === "low" ? "low" : "normal"
  };
}

function graphMessageFromCompose(payload: ComposePayload) {
  return {
    subject: payload.subject,
    body: { contentType: "Text", content: payload.bodyText },
    toRecipients: payload.to.map(toGraphRecipient),
    ccRecipients: payload.cc?.map(toGraphRecipient) ?? []
  };
}

function graphAddress(recipient?: GraphRecipient): MailAddress {
  return {
    name: recipient?.emailAddress.name,
    email: recipient?.emailAddress.address ?? "unknown@example.invalid"
  };
}

function toGraphRecipient(address: MailAddress): GraphRecipient {
  return { emailAddress: { name: address.name, address: address.email } };
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
