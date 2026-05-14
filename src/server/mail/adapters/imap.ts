import type { ComposePayload, EmailMessage, MailLabel } from "@/lib/types";
import type { MailProviderAdapter, ProviderCredentials } from "./types";

type ImapCredentials = Extract<ProviderCredentials, { provider: "imap" }>;
type ImapEnvelopeAddress = { name?: string; mailbox?: string; host?: string };
type ImapFetchItem = {
  envelope?: {
    messageId?: string;
    subject?: string;
    from?: ImapEnvelopeAddress[];
    to?: ImapEnvelopeAddress[];
    cc?: ImapEnvelopeAddress[];
    date?: string | Date;
  };
  flags?: Set<string> | string[];
  uid: number | string;
  source?: Buffer | string;
};

export class ImapAdapter implements MailProviderAdapter {
  provider = "imap" as const;

  constructor(private readonly accountId: string, private readonly credentials: ImapCredentials) {}

  async listMessages(options: { query?: string; limit?: number } = {}): Promise<EmailMessage[]> {
    const client = await this.connect();
    try {
      await client.mailboxOpen("INBOX");
      const messages: EmailMessage[] = [];
      const mailbox = client.mailbox as { exists?: number } | false;
      const exists = mailbox && typeof mailbox === "object" ? Number(mailbox.exists ?? 1) : 1;
      const range = `${Math.max(1, exists - (options.limit ?? 25) + 1)}:*`;

      for await (const item of client.fetch(range, { envelope: true, flags: true, uid: true, source: true })) {
        const normalized = normalizeImapMessage(this.accountId, item);
        if (!options.query || normalizedMatches(normalized, options.query)) {
          messages.push(normalized);
        }
      }

      return messages.sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
    } finally {
      await client.logout();
    }
  }

  async getMessage(id: string): Promise<EmailMessage> {
    const client = await this.connect();
    try {
      await client.mailboxOpen("INBOX");
      const uid = Number(id.replace(/^imap:/, ""));
      for await (const item of client.fetch(`${uid}`, { envelope: true, flags: true, uid: true, source: true }, { uid: true })) {
        return normalizeImapMessage(this.accountId, item);
      }
      throw new Error(`IMAP message not found: ${id}`);
    } finally {
      await client.logout();
    }
  }

  async send(payload: ComposePayload): Promise<{ providerMessageId: string }> {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: this.credentials.smtp.host,
      port: this.credentials.smtp.port,
      secure: this.credentials.smtp.secure,
      auth: {
        user: this.credentials.smtp.username,
        pass: this.credentials.smtp.password
      }
    });

    const result = await transport.sendMail({
      from: this.credentials.smtp.username,
      to: payload.to.map((address) => address.email).join(", "),
      cc: payload.cc?.map((address) => address.email).join(", "),
      subject: payload.subject,
      text: payload.bodyText
    });

    return { providerMessageId: result.messageId };
  }

  async reply(_message: EmailMessage, payload: ComposePayload): Promise<{ providerMessageId: string }> {
    return this.send(payload);
  }

  async forward(_message: EmailMessage, payload: ComposePayload): Promise<{ providerMessageId: string }> {
    return this.send(payload);
  }

  async archive(message: EmailMessage): Promise<void> {
    const client = await this.connect();
    try {
      await client.mailboxOpen("INBOX");
      await client.messageMove(Number(message.providerMessageId), "Archive", { uid: true });
    } finally {
      await client.logout();
    }
  }

  async delete(message: EmailMessage): Promise<void> {
    const client = await this.connect();
    try {
      await client.mailboxOpen("INBOX");
      await client.messageDelete(Number(message.providerMessageId), { uid: true });
    } finally {
      await client.logout();
    }
  }

  async applyLabel(message: EmailMessage, label: MailLabel): Promise<void> {
    const client = await this.connect();
    try {
      await client.mailboxOpen("INBOX");
      await client.messageFlagsAdd(Number(message.providerMessageId), [`$${label.name}`], { uid: true });
    } finally {
      await client.logout();
    }
  }

  async removeLabel(message: EmailMessage, label: MailLabel): Promise<void> {
    const client = await this.connect();
    try {
      await client.mailboxOpen("INBOX");
      await client.messageFlagsRemove(Number(message.providerMessageId), [`$${label.name}`], { uid: true });
    } finally {
      await client.logout();
    }
  }

  private async connect() {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: this.credentials.imap.host,
      port: this.credentials.imap.port,
      secure: this.credentials.imap.secure,
      auth: {
        user: this.credentials.imap.username,
        pass: this.credentials.imap.password
      },
      logger: false
    });
    await client.connect();
    return client;
  }
}

export async function testImapConnection(credentials: ImapCredentials): Promise<void> {
  const adapter = new ImapAdapter("connection-test", credentials);
  await adapter.listMessages({ limit: 1 });
}

function normalizeImapMessage(accountId: string, item: ImapFetchItem): EmailMessage {
  const envelope = item.envelope ?? {};
  const uid = String(item.uid);
  const bodyText = item.source ? Buffer.from(item.source).toString("utf8").slice(0, 4_000) : "";
  const flags = Array.from(item.flags ?? []).map(String);

  return {
    id: `imap:${uid}`,
    providerMessageId: uid,
    threadId: envelope.messageId ?? `imap-thread:${uid}`,
    accountId,
    provider: "imap",
    subject: envelope.subject ?? "(no subject)",
    from: imapAddress(envelope.from?.[0]),
    to: (envelope.to ?? []).map(imapAddress),
    cc: (envelope.cc ?? []).map(imapAddress),
    receivedAt: envelope.date ? new Date(envelope.date).toISOString() : new Date().toISOString(),
    snippet: bodyText.replace(/\s+/g, " ").slice(0, 180),
    bodyText,
    labels: flags.map((flag) => flag.replace(/^\\?/, "").toLowerCase()),
    flags: {
      unread: !flags.includes("\\Seen"),
      deleted: flags.includes("\\Deleted"),
      archived: false
    },
    priority: flags.includes("$Important") ? "high" : "normal"
  };
}

function imapAddress(address: ImapEnvelopeAddress | undefined) {
  const email = [address?.mailbox, address?.host].filter(Boolean).join("@");
  return { name: address?.name, email: email || "unknown@example.invalid" };
}

function normalizedMatches(message: EmailMessage, query: string): boolean {
  return [message.subject, message.from.email, message.snippet, message.bodyText]
    .join(" ")
    .toLowerCase()
    .includes(query.toLowerCase());
}
