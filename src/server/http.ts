import { NextRequest, NextResponse } from "next/server";
import type { ApiErrorBody } from "@/lib/types";
import { isValidAccessToken } from "./security/crypto";

export function unauthorized(): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code: "unauthorized", message: "Invalid app access token" } },
    { status: 401 }
  );
}

export function requireAccess(request: NextRequest): NextResponse<ApiErrorBody> | null {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const header = request.headers.get("x-app-access-token");
  return isValidAccessToken(bearer ?? header) ? null : unauthorized();
}

export function apiError(error: unknown, status = 500): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code: status >= 500 ? "server_error" : "request_error",
        message: error instanceof Error ? error.message : String(error)
      }
    },
    { status }
  );
}
