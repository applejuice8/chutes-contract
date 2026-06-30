import { NextRequest, NextResponse } from "next/server";

// Public TEE Attestation Explorer (Phala / t16z). It accepts the raw binary
// TDX quote as a multipart upload and returns a report id; the human-readable
// verification report then lives at /reports/{id}. We proxy server-side to
// avoid browser CORS restrictions.
const EXPLORER_UPLOAD = "https://proof.t16z.com/api/upload";
const EXPLORER_REPORT = "https://proof.t16z.com/reports";

export async function POST(req: NextRequest) {
  let tdxQuote: string | undefined;
  try {
    ({ tdxQuote } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!tdxQuote || tdxQuote === "unavailable") {
    return NextResponse.json(
      { error: "No TDX quote available to verify" },
      { status: 400 }
    );
  }

  // The quote is stored base64-encoded; the explorer wants the raw bytes.
  let bytes: Buffer;
  try {
    bytes = Buffer.from(tdxQuote, "base64");
    if (bytes.length === 0) throw new Error("empty");
  } catch {
    return NextResponse.json(
      { error: "Quote is not valid base64" },
      { status: 400 }
    );
  }

  try {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }),
      "quote.bin"
    );

    const res = await fetch(EXPLORER_UPLOAD, { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Attestation explorer rejected the quote (${res.status}): ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!data.id) {
      return NextResponse.json(
        { error: "Attestation explorer did not return a report id" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reportUrl: `${EXPLORER_REPORT}/${data.id}`,
      id: data.id,
      success: data.success ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to reach attestation explorer",
      },
      { status: 502 }
    );
  }
}
