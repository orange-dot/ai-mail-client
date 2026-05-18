import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMessage, patchMessage } from "@/server/db/repository";
import { apiError, requireAccess } from "@/server/http";
import { summarizeMessage } from "@/server/ai/anthropic";
import { resolveAnthropicKey } from "@/server/config/session-credentials";

const schema = z.object({
  messageId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const { messageId } = schema.parse(await request.json());
    const message = await getMessage(messageId);
    if (!message) return apiError(new Error("Message not found"), 404);

    const summary = await summarizeMessage(message, await resolveAnthropicKey());
    await patchMessage(message.id, { aiSummary: summary });
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error, 400);
    }
    return apiError(error, 500);
  }
}
