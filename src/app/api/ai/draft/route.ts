import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { draftReply } from "@/server/ai/anthropic";
import { resolveAnthropicKey } from "@/server/config/session-credentials";
import { getMessage } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";

const schema = z.object({
  messageId: z.string(),
  tone: z.enum(["direct", "warm", "formal"]).default("direct"),
  instruction: z.string().optional()
});

export async function POST(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const body = schema.parse(await request.json());
    const message = await getMessage(body.messageId);
    if (!message) return apiError(new Error("Message not found"), 404);

    const draft = await draftReply(
      { message, tone: body.tone, instruction: body.instruction },
      await resolveAnthropicKey()
    );
    return NextResponse.json({ draft });
  } catch (error) {
    return apiError(error, 400);
  }
}
