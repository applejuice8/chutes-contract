// src/app/api/auth/chutes/login/route.ts
import { NextResponse } from "next/server";
import {
  CHUTES_AUTH_CONFIG,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "@/lib/chutesAuth";

export async function GET() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CHUTES_AUTH_CONFIG.clientId,
    redirect_uri: CHUTES_AUTH_CONFIG.redirectUri,
    scope: CHUTES_AUTH_CONFIG.scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${CHUTES_AUTH_CONFIG.authorizationEndpoint}?${params}`;

  // Route through the Chutes web auth page so users see all login
  // methods (Google, GitHub, Hotkey, Fingerprint). After they sign in,
  // it redirects back into the OAuth /authorize flow above.
  const loginUrl = `${CHUTES_AUTH_CONFIG.webAuthUrl}?redirect_to=${encodeURIComponent(authUrl)}`;

  const res = NextResponse.redirect(loginUrl);

  // Attach cookies for the redirect command
  res.cookies.set("chutes_pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  res.cookies.set("chutes_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return res;
}
