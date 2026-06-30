import { NextRequest, NextResponse } from "next/server";

// In-memory store for hackathon — replace with DB in production
// This is module-level so it persists across requests in the same process
export const receiptStore = new Map<string, unknown>();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const receipt = receiptStore.get(id);
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }
  return NextResponse.json(receipt);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  receiptStore.set(id, body);
  return NextResponse.json({ ok: true });
}
