import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ComposePayload } from "@/lib/types";
import { listAccounts } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";
import { adapterFromEncryptedCredential } from "@/server/mail/provider-registry";

const addressSchema = z.object({ name: z.string().optional(), email: z.string().email() });
const composeSchema = z.object({
  accountId: z.string(),
  to: z.array(addressSchema).min(1),
  cc: z.array(addressSchema).optional(),
  bcc: z.array(addressSchema).optional(),
  subject: z.string().min(1),
  bodyText: z.string().min(1),
  inReplyToId: z.string().optional(),
  forwardOfId: z.string().optional()
});

export async function POST(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const payload = composeSchema.parse(await request.json()) satisfies ComposePayload;
    const account = (await listAccounts()).find((candidate) => candidate.id === payload.accountId);
    if (!account) return apiError(new Error("Account not found"), 404);

    if (account.status === "demo" || !account.encryptedCredential) {
      return NextResponse.json({ providerMessageId: `demo:${crypto.randomUUID()}` }, { status: 202 });
    }

    const adapter = adapterFromEncryptedCredential({ ...account, accountId: account.id });
    const result = await adapter.send(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}
