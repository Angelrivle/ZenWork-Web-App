import { NextRequest, NextResponse } from "next/server";
import {
  completeOAuthLogin,
  exchangeCodeForToken,
  fetchProviderUser,
  getRedirectUri,
  isOAuthConfigured,
  verifyOAuthState,
} from "@/lib/oauth";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  if (!isOAuthConfigured("discord")) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", origin));
  }

  if (request.nextUrl.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/login?error=oauth_denied", origin));
  }

  if (!verifyOAuthState(request)) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  try {
    const accessToken = await exchangeCodeForToken(
      "discord",
      code,
      getRedirectUri("discord", origin)
    );
    if (!accessToken) {
      return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
    }

    const profile = await fetchProviderUser("discord", accessToken);
    return await completeOAuthLogin(request, "discord", profile);
  } catch (error) {
    console.error("Discord OAuth error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }
}