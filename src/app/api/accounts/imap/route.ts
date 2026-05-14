import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveAccount } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";
import { testImapConnection } from "@/server/mail/adapters/imap";
import type { ProviderCredentials } from "@/server/mail/adapters/types";
import { encryptSecret } from "@/server/security/crypto";

const schema = z.object({
  address: z.string().email(),
  displayName: z.string().min(1).default("IMAP"),
  imap: z.object({
    host: z.string().min(1),
    port: z.coerce.number().int().positive(),
    secure: z.boolean().default(true),
    username: z.string().min(1),
    password: z.string().min(1)
  }),
  smtp: z.object({
    host: z.string().min(1),
    port: z.coerce.number().int().positive(),
    secure: z.boolean().default(true),
    username: z.string().min(1),
    password: z.string().min(1)
  })
});

export async function POST(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const body = schema.parse(await request.json());
    const credentials: ProviderCredentials = { provider: "imap", imap: body.imap, smtp: body.smtp };

    if (process.env.DEMO_MODE !== "true") {
      await testImapConnection(credentials);
    }

    const account = await saveAccount({
      id: `imap:${body.address}`,
      provider: "imap",
      address: body.address,
      displayName: body.displayName,
      color: "#5b5f97",
      encryptedCredential: encryptSecret(JSON.stringify(credentials))
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}
