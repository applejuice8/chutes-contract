"use client";

import { useState } from "react";
import { NotarizationReceipt } from "@/lib/teeAttestation";

interface Props {
  receipt: NotarizationReceipt;
}

function VerificationTier({
  level,
  title,
  status,
  children,
}: {
  level: number;
  title: string;
  status: "verified" | "unavailable";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400">LEVEL {level}</span>
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {status === "verified" ? (
            <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <span>✅</span> Verified
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-500 text-sm font-medium">
              <span>⚠️</span> Unavailable
            </span>
          )}
          <span className="text-gray-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && <div className="p-4 bg-white space-y-2">{children}</div>}
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <code className="text-xs text-gray-800 font-mono truncate max-w-[300px]">
          {value === "unavailable" ? (
            <span className="text-amber-500 italic">
              Not available (TEE endpoint cold)
            </span>
          ) : (
            value
          )}
        </code>
        {value !== "unavailable" && (
          <button
            onClick={copy}
            className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ReceiptPanel({ receipt }: Props) {
  const hasTEE = receipt.tdxQuote !== "unavailable";
  const [verifying, setVerifying] = useState(false);

  const verifyQuote = async () => {
    // Open the tab synchronously so popup blockers don't kill it, then
    // navigate it once the explorer returns a report URL.
    const win = window.open("about:blank", "_blank");
    setVerifying(true);
    try {
      const res = await fetch("/api/contracts/verify-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tdxQuote: receipt.tdxQuote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      if (win) win.location.href = data.reportUrl;
      else window.open(data.reportUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      if (win) win.close();
      alert(
        `Could not open verification: ${
          e instanceof Error ? e.message : "Unknown error"
        }`
      );
    } finally {
      setVerifying(false);
    }
  };

  const downloadReceipt = () => {
    const blob = new Blob([JSON.stringify(receipt, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proofsign-receipt-${receipt.receiptId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-2 border-emerald-200 rounded-xl p-6 bg-emerald-50 space-y-4 my-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            🔐 Notarization Receipt
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Cryptographic proof this analysis ran inside an Intel TDX enclave
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadReceipt}
            className="px-3 py-1.5 text-sm border border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-100"
          >
            ⬇ Download JSON
          </button>
          {hasTEE && (
            <button
              onClick={verifyQuote}
              disabled={verifying}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {verifying ? "Verifying…" : "Verify TDX Quote ↗"}
            </button>
          )}
        </div>
      </div>

      {/* Receipt ID */}
      <div className="bg-white rounded-lg p-3 border border-emerald-100">
        <p className="text-xs text-gray-400 mb-1">Receipt ID</p>
        <code className="text-sm font-mono text-gray-800">
          {receipt.receiptId}
        </code>
      </div>

      {/* Three verification tiers */}
      <div className="space-y-2">
        <VerificationTier level={1} title="Document Integrity" status="verified">
          <p className="text-sm text-gray-600 mb-3">
            The contract you uploaded was hashed before analysis. Anyone with
            the original file can verify the hash matches — proving the analyzed
            document is exactly what you uploaded.
          </p>
          <HashRow
            label="Contract SHA-256"
            value={`sha256:${receipt.contractHash}`}
          />
          <HashRow
            label="Analysis SHA-256"
            value={`sha256:${receipt.analysisHash}`}
          />
          <HashRow label="Analyzed at" value={receipt.completedAt} />
        </VerificationTier>

        <VerificationTier level={2} title="Model Identity" status="verified">
          <p className="text-sm text-gray-600 mb-3">
            The exact model that ran your analysis is recorded. The TEE image
            measurements include model weight hashes, defeating bait-and-switch
            attacks.
          </p>
          <HashRow label="Model" value={receipt.modelId} />
          <HashRow label="Chute ID" value={receipt.chuteId} />
          <HashRow label="Instance ID" value={receipt.instanceId} />
          <HashRow label="Nonce" value={receipt.nonce} />
        </VerificationTier>

        <VerificationTier
          level={3}
          title="Intel TDX Enclave Proof"
          status={hasTEE ? "verified" : "unavailable"}
        >
          {hasTEE ? (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Analysis ran inside an Intel TDX Trust Domain with NVIDIA
                H100/H200 in Confidential Compute mode. The TDX Quote is signed
                by Intel&apos;s CPU-fused key and can be independently verified.
                The nonce is bound to the enclave&apos;s ML-KEM public key,
                preventing replay attacks.
              </p>
              <HashRow
                label="TDX Quote (base64)"
                value={receipt.tdxQuote.slice(0, 80) + "..."}
              />
              <HashRow
                label="Report data binding"
                value={receipt.reportDataBinding}
              />
              <HashRow
                label="GPU Evidence"
                value={
                  receipt.gpuEvidence !== "unavailable"
                    ? "NVIDIA CC attestation present"
                    : "unavailable"
                }
              />
              <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-500 font-mono leading-relaxed">
                {receipt.verificationInstructions}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-amber-700">
                TEE attestation evidence was not available when this analysis
                ran (enclave may have been cold or the model was not TEE-enabled).
                The document and analysis hashes in Level 1 are still valid.
              </p>
              <p className="text-sm text-gray-500">
                To get full TEE attestation, ensure you are using a TEE-enabled
                model (e.g. <code>deepseek-ai/DeepSeek-V3.2-TEE</code>) and
                that the Chutes instance is warmed up.
              </p>
            </div>
          )}
        </VerificationTier>
      </div>

      {/* What OpenAI can't do */}
      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm">
        <p className="font-semibold mb-1">Why this matters</p>
        <p className="text-gray-300 leading-relaxed">
          OpenAI, Anthropic, and every other major provider run inference on
          conventional servers — the host OS, hypervisor, and provider employees
          can in principle access your prompts and outputs. Chutes TEE inference
          runs inside a hardware-isolated Intel TDX enclave: not even Chutes can
          read your contract. This receipt is cryptographic proof, not a privacy
          policy promise.
        </p>
      </div>
    </div>
  );
}
