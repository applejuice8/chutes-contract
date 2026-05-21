// Core OAuth/PKCE utilities for Sign in with Chutes
const CHUTES_IDP_BASE = "https://api.chutes.ai/idp";

export const CHUTES_AUTH_CONFIG = {
  clientId: process.env.CHUTES_OAUTH_CLIENT_ID!,
  clientSecret: process.env.CHUTES_OAUTH_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/chutes/callback`,
  scopes: ["openid", "profile", "chutes:invoke"],
  authorizationEndpoint: `${CHUTES_IDP_BASE}/authorize`,
  tokenEndpoint: `${CHUTES_IDP_BASE}/token`,
  userInfoEndpoint: `${CHUTES_IDP_BASE}/userinfo`,
};

// --- PKCE helpers ---

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// --- Token exchange ---

export interface ChutesTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<ChutesTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CHUTES_AUTH_CONFIG.clientId,
    client_secret: CHUTES_AUTH_CONFIG.clientSecret,
    redirect_uri: CHUTES_AUTH_CONFIG.redirectUri,
    code,
    code_verifier: codeVerifier,
  });

  const res = await fetch(CHUTES_AUTH_CONFIG.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

// --- User info ---

export interface ChutesUser {
  sub: string;
  username: string;
  email?: string;
  name?: string;
}

export async function fetchUserInfo(accessToken: string): Promise<ChutesUser> {
  const res = await fetch(CHUTES_AUTH_CONFIG.userInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to fetch user info");
  return res.json();
}
