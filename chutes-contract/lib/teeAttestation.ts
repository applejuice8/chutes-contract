/**
 * Chutes TEE Attestation helpers
 * Calls GET /chutes/{chuteId}/evidence to fetch TDX quote + GPU attestation
 * bound to a user-supplied nonce.
 */

const CHUTES_API = "https://api.chutes.ai";

export interface TEEInstanceInfo {
  instance_id: string;
  e2e_pubkey: string; // base64 ML-KEM-768 public key
  nonce: string;
}

export interface TEEEvidence {
  instance_id: string;
  quote: string; // base64 TDX quote (Intel DCAP verifiable)
  gpu_evidence: unknown; // NVIDIA CC attestation (array of per-GPU evidence)
  certificate?: string; // PCK / quote certificate chain (base64)
}

export interface NotarizationReceipt {
  receiptId: string;
  contractHash: string;
  analysisHash: string;
  modelId: string;
  chuteId: string;
  instanceId: string;
  nonce: string;
  tdxQuote: string;
  gpuEvidence: string;
  reportDataBinding: string;
  requestedAt: string;
  completedAt: string;
  verificationInstructions: string;
  intelDcapVerifyUrl: string;
}

/** Generate a cryptographically random 32-byte nonce as 64 hex chars */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 a string, return hex */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 an ArrayBuffer (for file hashing), return hex */
export async function sha256HexBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fetch TEE instances for a chute — returns available E2EE-capable instances
 * with their ML-KEM public keys and nonces.
 */
export async function fetchTEEInstances(
  accessToken: string,
  chuteIdOrName: string
): Promise<TEEInstanceInfo[]> {
  const res = await fetch(`${CHUTES_API}/e2e/instances/${chuteIdOrName}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch TEE instances: ${res.status} ${text}`);
  }
  const data = await res.json();
  // API returns array of instances
  return Array.isArray(data) ? data : data.instances ?? [];
}

/**
 * Fetch TDX quote + GPU evidence for a specific chute, bound to your nonce.
 * The nonce MUST be 64 hex characters (32 bytes).
 * The returned TDX quote's report_data = SHA256(nonce || e2e_pubkey)
 * This cryptographically binds your freshness nonce to the specific enclave instance.
 */
export async function fetchTEEEvidence(
  accessToken: string,
  chuteIdOrName: string,
  nonce: string
): Promise<TEEEvidence[]> {
  const url = `${CHUTES_API}/chutes/${chuteIdOrName}/evidence?nonce=${nonce}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch TEE evidence: ${res.status} ${text}`);
  }
  const data = await res.json();
  // Returns { evidence: [...], failed_instance_ids: [...] } with one entry per
  // TEE instance. Older/alternate shapes may return a bare array or `instances`.
  if (Array.isArray(data)) return data;
  return data.evidence ?? data.instances ?? [];
}

/**
 * Build a complete NotarizationReceipt from analysis inputs and TEE evidence.
 */
export async function buildReceipt(params: {
  contractHash: string;
  analysisText: string;
  modelId: string;
  chuteId: string;
  nonce: string;
  evidence: TEEEvidence[];
  requestedAt: string;
}): Promise<NotarizationReceipt> {
  const {
    contractHash,
    analysisText,
    modelId,
    chuteId,
    nonce,
    evidence,
    requestedAt,
  } = params;

  const analysisHash = await sha256Hex(analysisText);
  const completedAt = new Date().toISOString();

  // Use the first available evidence entry (one per TEE instance).
  const ev = evidence[0];
  const hasEvidence = Boolean(ev && ev.quote);

  const tdxQuote = hasEvidence ? ev.quote : "unavailable";
  const instanceId = hasEvidence ? ev.instance_id : "unavailable";
  // gpu_evidence is an array of per-GPU NVIDIA CC attestations; serialize the
  // raw structure into the receipt so it remains independently verifiable.
  const gpuEvidence =
    hasEvidence && ev.gpu_evidence != null
      ? typeof ev.gpu_evidence === "string"
        ? ev.gpu_evidence
        : JSON.stringify(ev.gpu_evidence)
      : "unavailable";

  const receiptId = crypto.randomUUID();

  return {
    receiptId,
    contractHash,
    analysisHash,
    modelId,
    chuteId,
    instanceId,
    nonce,
    tdxQuote,
    gpuEvidence,
    // The Chutes evidence endpoint binds the caller-supplied nonce into the
    // TDX quote's report_data field. There is no separate e2e pubkey returned
    // by this endpoint, so the binding is expressed against the nonce directly.
    reportDataBinding: hasEvidence
      ? `nonce embedded in TDX quote report_data (SHA256 of nonce ${nonce})`
      : "unavailable",
    requestedAt,
    completedAt,
    verificationInstructions:
      "To independently verify: (1) Upload the base64 tdxQuote (decoded to raw bytes) to a TEE attestation explorer such as https://proof.t16z.com — the 'Verify TDX Quote' button does this for you. " +
      "(2) Confirm the hardware signature chains to Intel's roots (genuine Intel TDX). " +
      "(3) Confirm the quote's report_data is bound to your nonce. " +
      "(4) Confirm td_attributes debug bit is clear (not a debug enclave). " +
      "(5) Compare contractHash to SHA256 of your original document.",
    intelDcapVerifyUrl: `https://proof.t16z.com/`,
  };
}
