// src/lib/serverAuth.ts
// Server-side utilities for reading the session cookie
import { cookies } from "next/headers";
import type { ChutesUser } from "./chutesAuth";

export const SESSION_COOKIE = "chutes_session";

export interface ChutesSession {
  accessToken: string;
  refreshToken?: string;
  user: ChutesUser;
  expiresAt: number;
}

export async function getServerSession(): Promise<ChutesSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function getServerAccessToken(): Promise<string | null> {
  const session = await getServerSession();
  if (!session) return null;
  if (Date.now() > session.expiresAt) return null;
  return session.accessToken;
}

export function encodeSession(session: ChutesSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}
