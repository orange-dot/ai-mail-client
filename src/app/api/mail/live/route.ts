// Verify-only diagnostic route for cooperation coop-20260514-131621-gml.
//
// It exercises GmailAdapter.listMessages against a live, connected account so
// the Gmail end-to-end verify is executable without a full inbox-sync pipeline.
// The response is a deliberately redacted projection: counts, opaque provider
// IDs, and sender email only — never message bodies, snippets, header text, or
// tokens.
//
// This is a development affordance, not product surface. Do NOT deploy it.
// Remove it, or place it behind a stronger guard, before any non-local
// environment. It is gated by requireAccess exactly like the other /api/mail
// routes (open only when APP_ACCESS_TOKEN is unset, i.e. local demo mode).
import { NextRequest, NextResponse } from "next/server";
import { listAccounts } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";
import { adapterFromEncryptedCredential } from "@/server/mail/provider-registry";

export async function GET(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId");
    if (!accountId) return apiError(new Error("accountId query parameter is required"), 400);

    const account = (await listAccounts()).find((candidate) => candidate.id === accountId);
    if (!account) return apiError(new Error("Account not found"), 404);
    if (!account.encryptedCredential) {
      return apiError(new Error("Account has no stored credential"), 400);
    }

    const parsedLimit = Number(url.searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 25) : 10;

    const adapter = adapterFromEncryptedCredential({ ...account, accountId: account.id });
    const messages = await adapter.listMessages({ limit });

    return NextResponse.json({
      accountId: account.id,
      provider: account.provider,
      count: messages.length,
      messages: messages.map((message) => ({
        id: message.id,
        providerMessageId: message.providerMessageId,
        threadId: message.threadId,
        fromEmail: message.from.email,
        receivedAt: message.receivedAt,
        subjectLength: message.subject.length,
        bodyTextLength: message.bodyText.length,
        hasBodyHtml: Boolean(message.bodyHtml),
        labels: message.labels,
        unread: message.flags.unread
      }))
    });
  } catch (error) {
    return apiError(error);
  }
}
