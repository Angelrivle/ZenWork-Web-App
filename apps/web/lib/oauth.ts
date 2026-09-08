import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@zenwork/db";
import { transaction } from "@zenwork/db/adapter";
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  storeRefreshToken,
} from "@zenwork/auth";
import { generateCsrfToken } from "@zenwork/middleware";
import { createOrganizationBody } from "@/lib/services";

export type OAuthProvider = "discord" | "github";

export const OAUTH_STATE_COOKIE = "zenwork_oauth_state";

// ============================================================
// CONFIG
// ============================================================

export function getOAuthConfig(provider: OAuthProvider) {
  const isDiscord = provider === "discord";
  const clientId =
    process.env[isDiscord ? "ZENWORK_DISCORD_CLIENT_ID" : "ZENWORK_GITHUB_CLIENT_ID"];
  const clientSecret =
    process.env[isDiscord ? "ZENWORK_DISCORD_CLIENT_SECRET" : "ZENWORK_GITHUB_CLIENT_SECRET"];
  return { clientId, clientSecret };
}

export function isOAuthConfigured(provider: OAuthProvider): boolean {
  const { clientId, clientSecret } = getOAuthConfig(provider);
  return Boolean(clientId && clientSecret);
}

export function getRedirectUri(provider: OAuthProvider, origin: string): string {
  return `${origin}/api/auth/callback/${provider}`;
}

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string
): string {
  const { clientId } = getOAuthConfig(provider);
  if (!clientId) return "";

  if (provider === "discord") {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email",
      state,
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

// ============================================================
// FLOW HELPERS
// ============================================================

export function startOAuth(
  request: NextRequest,
  provider: OAuthProvider
): NextResponse {
  const redirectUri = getRedirectUri(provider, request.nextUrl.origin);
  const state = generateCsrfToken();
  const authUrl = buildAuthorizeUrl(provider, redirectUri, state);
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}

export function verifyOAuthState(request: NextRequest): boolean {
  const state = request.nextUrl.searchParams.get("state");
  const cookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  return Boolean(state && cookie && state === cookie);
}

export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<string | null> {
  const { clientId, clientSecret } = getOAuthConfig(provider);
  if (!clientId || !clientSecret) return null;

  const isDiscord = provider === "discord";
  const url = isDiscord
    ? "https://discord.com/api/oauth2/token"
    : "https://github.com/login/oauth/access_token";

  const headers: Record<string, string> = isDiscord
    ? { "Content-Type": "application/x-www-form-urlencoded" }
    : { "Content-Type": "application/json", Accept: "application/json" };

  const body = isDiscord
    ? new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString()
    : JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      });

  const res = await fetch(url, { method: "POST", headers, body });
  const data = await res.json().catch(() => ({}));
  return data.access_token || null;
}

async function fetchDiscordUser(accessToken: string) {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const u = await res.json().catch(() => ({}));
  if (!u.id) throw new Error("No se pudo obtener el usuario de Discord");
  
  // Seguridad: solo confiar en el email si Discord confirma que fue verificado (u.verified === true)
  // para evitar ataques de Account Takeover por vinculación ciega de emails no verificados.
  const verifiedEmail = Boolean(u.verified && u.email) ? (u.email as string) : null;

  return {
    providerId: String(u.id),
    email: verifiedEmail,
    name: u.global_name || u.username || "Usuario Discord",
    avatarUrl: null,
  };
}

async function fetchGithubUser(accessToken: string) {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ZenWork" },
  });
  const u = await res.json().catch(() => ({}));
  if (!u.id) throw new Error("No se pudo obtener el usuario de GitHub");

  let email: string | null = u.email || null;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ZenWork" },
    });
    const emails = await emailsRes.json().catch(() => []);
    const primary = Array.isArray(emails)
      ? emails.find((e: { verified?: boolean; primary?: boolean; email?: string }) => e.verified && e.primary)
      : null;
    email = primary?.email || null;
  }

  return {
    providerId: String(u.id),
    email,
    name: u.name || u.login || "Usuario GitHub",
    avatarUrl: u.avatar_url || null,
  };
}

export async function fetchProviderUser(
  provider: OAuthProvider,
  accessToken: string
): Promise<{ providerId: string; email: string | null; name: string; avatarUrl: string | null }> {
  return provider === "discord"
    ? fetchDiscordUser(accessToken)
    : fetchGithubUser(accessToken);
}

// ============================================================
// SESIÓN FINAL
// ============================================================

/**
 * Encuentra o crea el usuario a partir del perfil OAuth, emite el par de
 * tokens (access + refresh), setea cookies y redirige al dashboard.
 */
export async function completeOAuthLogin(
  request: NextRequest,
  provider: OAuthProvider,
  profile: { providerId: string; email: string | null; name: string; avatarUrl: string | null }
): Promise<NextResponse> {
  const origin = request.nextUrl.origin;

  const { userId, firstOrgSlug } = await findOrCreateOAuthUser(
    provider,
    profile
  );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", origin)
    );
  }

  const accessToken = await generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken);

  const path = firstOrgSlug ? `/organizations/${firstOrgSlug}` : "/login?registered=1";
  const response = NextResponse.redirect(new URL(path, origin));

  setAuthCookies(
    (name, value, options) => response.cookies.set(name, value, options),
    accessToken,
    refreshToken
  );

  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

async function findOrCreateOAuthUser(
  provider: OAuthProvider,
  profile: { providerId: string; email: string | null; name: string; avatarUrl: string | null }
): Promise<{ userId: string; firstOrgSlug: string | null }> {
  const account = await prisma.userAccount.findUnique({
    where: { provider_providerId: { provider, providerId: profile.providerId } },
  });

  let userId: string | null = account?.userId || null;

  // Vincular a cuenta existente por email si aplica
  if (!userId && profile.email) {
    const existing = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existing) {
      userId = existing.id;
      await prisma.userAccount.upsert({
        where: { provider_providerId: { provider, providerId: profile.providerId } },
        update: { providerEmail: profile.email },
        create: {
          userId,
          provider,
          providerId: profile.providerId,
          providerEmail: profile.email,
        },
      });
    }
  }

  // Crear usuario nuevo + organización de bienvenida
  if (!userId) {
    const result = await transaction(async (tx) => {
      const syntheticEmail =
        profile.email || `${profile.providerId}@${provider}.zenwork.local`;
      const u = await tx.user.create({
        data: {
          email: syntheticEmail,
          name: profile.name,
          avatar: profile.avatarUrl,
          emailVerified: new Date(),
        },
      });
      await tx.userAccount.create({
        data: {
          userId: u.id,
          provider,
          providerId: profile.providerId,
          providerEmail: profile.email,
        },
      });
      const slugBase =
        profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
        profile.providerId.slice(0, 10);
      const org = await createOrganizationBody(tx, u.id, {
        name: `${profile.name}'s Workspace`,
        slug: `${slugBase}-workspace`,
      });
      return { userId: u.id, org };
    });
    userId = result.userId;
    return { userId, firstOrgSlug: result.org.organization.slug };
  }

  // Usuario existente: obtener su primera org para redirigir
  const firstOrg = await prisma.membership.findFirst({
    where: { userId, isActive: true },
    include: { organization: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  return { userId, firstOrgSlug: firstOrg?.organization.slug || null };
}