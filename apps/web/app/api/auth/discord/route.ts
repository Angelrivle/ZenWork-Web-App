import { NextRequest, NextResponse } from "next/server";
import { isOAuthConfigured, startOAuth } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  if (!isOAuthConfigured("discord")) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_not_configured&provider=discord", request.nextUrl.origin)
    );
  }
  return startOAuth(request, "discord");
}