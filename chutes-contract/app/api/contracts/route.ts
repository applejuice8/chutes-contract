import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverAuth";
import { listAnalyses } from "@/lib/db";

// GET /api/contracts — list the authenticated user's analyses (newest first).
export async function GET() {
  const session = await getServerSession();
  if (!session || Date.now() > session.expiresAt) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const contracts = await listAnalyses(session.user.sub);
    return NextResponse.json({ contracts });
  } catch (err) {
    console.error("Failed to list contracts:", err);
    return NextResponse.json(
      { error: "Failed to load contracts" },
      { status: 500 }
    );
  }
}
