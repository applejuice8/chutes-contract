// src/app/api/auth/chutes/session/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverAuth";

export async function GET() {
  const session = await getServerSession();

  if (!session || Date.now() > session.expiresAt) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}
