// src/app/api/auth/chutes/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchUserInfo } from "@/lib/chutesAuth";
import { SESSION_COOKIE, encodeSession } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, req.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?error=missing_params", req.url));
  }

  const storedState = req.cookies.get("chutes_oauth_state")?.value;
  const codeVerifier = req.cookies.get("chutes_pkce_verifier")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/?error=state_mismatch", req.url));
  }

  if (!codeVerifier) {
    return NextResponse.redirect(new URL("/?error=missing_verifier", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, codeVerifier);
    const user = await fetchUserInfo(tokens.access_token);

    const session = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    const res = NextResponse.redirect(new URL("/dashboard", req.url));

    res.cookies.set(SESSION_COOKIE, encodeSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in,
      path: "/",
    });

    // Clear PKCE cookies
    res.cookies.delete("chutes_pkce_verifier");
    res.cookies.delete("chutes_oauth_state");

    return res;
  } catch (err) {
    console.error("Chutes OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", req.url));
  }
}
