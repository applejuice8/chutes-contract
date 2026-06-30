import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverAuth";
import { getAnalysis, deleteAnalysis } from "@/lib/db";

// GET /api/contracts/:id — fetch a single analysis owned by the current user.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session || Date.now() > session.expiresAt) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const analysis = await getAnalysis(session.user.sub, id);
    if (!analysis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Failed to fetch contract:", err);
    return NextResponse.json(
      { error: "Failed to load contract" },
      { status: 500 }
    );
  }
}

// DELETE /api/contracts/:id — remove an analysis owned by the current user.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session || Date.now() > session.expiresAt) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await deleteAnalysis(session.user.sub, id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete contract:", err);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
