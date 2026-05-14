import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { buildOAuthUrl } from "@/server/auth/oauth";
import { apiError, requireAccess } from "@/server/http";

type Params = { params: Promise<{ provider: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const accessError = requireAccess(request);
  if (accessError) return accessError;

  try {
    const { provider } = await params;
    if (provider !== "gmail" && provider !== "microsoft365") {
      return apiError(new Error("Unsupported OAuth provider"), 404);
    }

    const state = randomBytes(18).toString("base64url");
    const cookieStore = await cookies();
    cookieStore.set("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/"
    });

    return NextResponse.redirect(buildOAuthUrl(provider, state));
  } catch (error) {
    return apiError(error, 400);
  }
}
