import { sql } from "@vercel/postgres";
import { demoAccounts, demoLabels, demoMessages } from "@/lib/demo-data";
import { filterMessages } from "@/lib/mail-filters";
import type { EmailAccount, EmailMessage, MailFilter, MailLabel } from "@/lib/types";

export type StoredAccount = EmailAccount & {
  encryptedCredential?: string;
};

type SaveAccountInput = Omit<StoredAccount, "unreadCount" | "status"> & {
  status?: StoredAccount["status"];
  unreadCount?: number;
};

function demoMode(): boolean {
  return process.env.DEMO_MODE === "true" || !process.env.POSTGRES_URL;
}

// Real mode (DEMO_MODE explicitly "false") without a provisioned Postgres URL.
// Connected accounts then live in-process so a Gmail OAuth connection can be
// verified end-to-end without standing up a database. Demo mode (DEMO_MODE
// "true", or unset) is unaffected and still returns demo data.
function realModeNoPostgres(): boolean {
  return process.env.DEMO_MODE === "false" && !process.env.POSTGRES_URL;
}

const memoryAccounts = new Map<string, StoredAccount>();

export async function listAccounts(): Promise<StoredAccount[]> {
  if (realModeNoPostgres()) return [...memoryAccounts.values()];
  if (demoMode()) return demoAccounts;

  const result = await sql`
    SELECT id, provider, address, display_name, status, unread_count, color, encrypted_credential, last_synced_at
    FROM email_accounts
    ORDER BY created_at ASC
  `;

  return result.rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    address: row.address,
    displayName: row.display_name,
    status: row.status,
    unreadCount: row.unread_count,
    color: row.color,
    encryptedCredential: row.encrypted_credential ?? undefined,
    lastSyncedAt: row.last_synced_at?.toISOString?.() ?? undefined
  }));
}

export async function saveAccount(account: SaveAccountInput): Promise<StoredAccount> {
  const stored: StoredAccount = {
    ...account,
    status: account.status ?? "connected",
    unreadCount: account.unreadCount ?? 0
  };

  if (realModeNoPostgres()) {
    memoryAccounts.set(stored.id, stored);
    return stored;
  }
  if (demoMode()) return stored;

  await sql`
    INSERT INTO email_accounts
      (id, provider, address, display_name, status, unread_count, color, encrypted_credential, last_synced_at, updated_at)
    VALUES
      (${stored.id}, ${stored.provider}, ${stored.address}, ${stored.displayName}, ${stored.status},
       ${stored.unreadCount}, ${stored.color}, ${stored.encryptedCredential ?? null}, ${stored.lastSyncedAt ?? null}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      provider = EXCLUDED.provider,
      address = EXCLUDED.address,
      display_name = EXCLUDED.display_name,
      status = EXCLUDED.status,
      unread_count = EXCLUDED.unread_count,
      color = EXCLUDED.color,
      encrypted_credential = EXCLUDED.encrypted_credential,
      last_synced_at = EXCLUDED.last_synced_at,
      updated_at = NOW()
  `;

  return stored;
}

export async function listLabels(): Promise<MailLabel[]> {
  if (demoMode()) return demoLabels;

  const result = await sql`
    SELECT id, account_id, name, color, system
    FROM mail_labels
    ORDER BY system DESC, name ASC
  `;

  return result.rows.map((row) => ({
    id: row.id,
    accountId: row.account_id ?? undefined,
    name: row.name,
    color: row.color,
    system: row.system
  }));
}

export async function listMessages(filter: MailFilter): Promise<EmailMessage[]> {
  if (demoMode()) return filterMessages(demoMessages, filter);

  const result = await sql`
    SELECT *
    FROM email_messages
    ORDER BY received_at DESC
    LIMIT 200
  `;

  const messages = result.rows.map(rowToMessage);
  return filterMessages(messages, filter);
}

export async function getMessage(id: string): Promise<EmailMessage | null> {
  if (demoMode()) return demoMessages.find((message) => message.id === id) ?? null;

  const result = await sql`SELECT * FROM email_messages WHERE id = ${id} LIMIT 1`;
  return result.rows[0] ? rowToMessage(result.rows[0]) : null;
}

export async function upsertMessage(message: EmailMessage): Promise<void> {
  if (demoMode()) return;

  await sql`
    INSERT INTO email_messages
      (id, provider_message_id, thread_id, account_id, provider, subject, sender, recipients, cc,
       received_at, snippet, body_text, body_html, labels, flags, priority, ai_summary, ai_rationale, attachments, updated_at)
    VALUES
      (${message.id}, ${message.providerMessageId}, ${message.threadId}, ${message.accountId}, ${message.provider},
       ${message.subject}, ${JSON.stringify(message.from)}::jsonb, ${JSON.stringify(message.to)}::jsonb,
       ${JSON.stringify(message.cc ?? null)}::jsonb, ${message.receivedAt}, ${message.snippet}, ${message.bodyText},
       ${message.bodyHtml ?? null}, ${JSON.stringify(message.labels)}::jsonb, ${JSON.stringify(message.flags)}::jsonb, ${message.priority},
       ${message.aiSummary ?? null}, ${message.aiRationale ?? null}, ${JSON.stringify(message.attachments ?? null)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      subject = EXCLUDED.subject,
      sender = EXCLUDED.sender,
      recipients = EXCLUDED.recipients,
      cc = EXCLUDED.cc,
      received_at = EXCLUDED.received_at,
      snippet = EXCLUDED.snippet,
      body_text = EXCLUDED.body_text,
      body_html = EXCLUDED.body_html,
      labels = EXCLUDED.labels,
      flags = EXCLUDED.flags,
      priority = EXCLUDED.priority,
      ai_summary = EXCLUDED.ai_summary,
      ai_rationale = EXCLUDED.ai_rationale,
      attachments = EXCLUDED.attachments,
      updated_at = NOW()
  `;
}

export async function patchMessage(id: string, patch: Partial<EmailMessage>): Promise<EmailMessage | null> {
  const existing = await getMessage(id);
  if (!existing) return null;

  const updated = { ...existing, ...patch };
  await upsertMessage(updated);
  return updated;
}

type DbRow = Record<string, unknown>;

function rowToMessage(row: DbRow): EmailMessage {
  return {
    id: String(row.id),
    providerMessageId: String(row.provider_message_id),
    threadId: String(row.thread_id),
    accountId: String(row.account_id),
    provider: row.provider as EmailMessage["provider"],
    subject: String(row.subject),
    from: row.sender as EmailMessage["from"],
    to: row.recipients as EmailMessage["to"],
    cc: (row.cc as EmailMessage["cc"]) ?? undefined,
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : String(row.received_at),
    snippet: String(row.snippet),
    bodyText: String(row.body_text),
    bodyHtml: row.body_html ? String(row.body_html) : undefined,
    labels: (row.labels as string[] | undefined) ?? [],
    flags: row.flags as EmailMessage["flags"],
    priority: row.priority as EmailMessage["priority"],
    aiSummary: row.ai_summary ? String(row.ai_summary) : undefined,
    aiRationale: row.ai_rationale ? String(row.ai_rationale) : undefined,
    attachments: (row.attachments as EmailMessage["attachments"]) ?? undefined
  };
}
