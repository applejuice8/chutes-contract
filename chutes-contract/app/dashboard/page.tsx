"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OverallRisk } from "@/lib/contractData";
import { useChutesSession } from "@/hooks/useChutesSession";

interface StoredClause {
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
}

interface ContractSummary {
  id: string;
  fileName: string;
  contractType: string;
  overallRisk: OverallRisk;
  summary: string;
  analyzedAt: string;
  clauses: StoredClause[];
  receipt?: { receiptId: string };
}

const riskStyles: Record<
  OverallRisk,
  { label: string; dot: string; badge: string }
> = {
  GREEN: {
    label: "Low risk",
    dot: "bg-emerald-400",
    badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  },
  AMBER: {
    label: "Review",
    dot: "bg-amber-300",
    badge: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  },
  RED: {
    label: "High risk",
    dot: "bg-red-400",
    badge: "border-red-400/20 bg-red-400/10 text-red-100",
  },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const router = useRouter();
  const { isLoading, user } = useChutesSession();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/contracts");
        if (!res.ok) {
          if (active) setContracts([]);
          return;
        }
        const data = await res.json();
        if (active) setContracts(data.contracts ?? []);
      } catch {
        if (active) setContracts([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(
    e: React.MouseEvent,
    id: string,
  ) {
    // The card is a Link — stop the click from navigating to the detail page.
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        "Delete this analysis? This permanently removes it and cannot be undone.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Could not delete the contract. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    if (isUploading) return;
    setIsModalOpen(false);
    setIsDragging(false);
    setSelectedFile(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const extension = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["txt", "pdf", "docx"];

    if (
      validTypes.includes(file.type) ||
      (extension && validExtensions.includes(extension))
    ) {
      setSelectedFile(file);
      return;
    }

    alert("Invalid file type. Please upload a .txt, .docx, or .pdf file.");
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  async function handleUploadSubmit(file: File) {
    setIsUploading(true);
    setElapsed(0);

    const stages = [
      "Reading & hashing document...",
      "Parsing document & extracting clauses...",
      "Scoring risk & translating to plain English...",
      "Drafting negotiation redlines...",
      "Summarizing & scoring overall risk...",
      "Generating TEE attestation receipt...",
    ];

    // Cycle through stage labels while waiting
    let stageIndex = 0;
    setUploadStage(stages[0]);
    const stageInterval = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stages.length - 1);
      setUploadStage(stages[stageIndex]);
    }, 30000);

    // Live elapsed counter so the UI never looks frozen during slow TEE calls.
    const elapsedInterval = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    const cleanup = () => {
      clearInterval(stageInterval);
      clearInterval(elapsedInterval);
    };

    try {
      const formData = new FormData();
      formData.append("contract", file);

      const res = await fetch("/api/contracts/analyze", {
        method: "POST",
        body: formData,
      });

      cleanup();

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Analysis failed");
      }

      const analysis = await res.json();

      // Analysis is persisted server-side (Supabase) by the analyze route.
      // Navigate to contract detail page, which loads it from the API.
      router.push(`/dashboard/${analysis.id}`);
    } catch (err) {
      cleanup();
      console.error("Upload failed:", err);
      alert(
        `Analysis failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    } finally {
      setIsUploading(false);
      setUploadStage("");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0e]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#c8f47b]/30 border-t-[#c8f47b]" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-y-auto bg-[#0f0f0e] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-12rem] h-96 w-96 rounded-full bg-[#c8f47b]/4 blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-cyan-400/4 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8">
        <section className="flex flex-col gap-5 border-b border-white/5 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c8f47b]/80">
              Welcome back, {user?.username || "Guest"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Contract analyses
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Open a contract to inspect the six TEE agent stages, clause risks,
              plain-English translations, negotiation rewrites, and the
              cryptographic notarization receipt.
            </p>
          </div>

          <button
            onClick={openModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#c8f47b] px-4 text-sm font-semibold text-[#0f0f0e] transition hover:bg-[#d4f78e] active:bg-[#b8e86a]"
          >
            <span className="text-lg leading-none">+</span>
            Analyze Contract
          </button>
        </section>

        {contracts.length === 0 ? (
          <section className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-white/10 bg-white/[0.02] py-20 text-center">
            <p className="text-base font-medium text-white/70">
              No contracts analyzed yet
            </p>
            <p className="max-w-md text-sm text-white/40">
              Upload a contract to run the six-agent TEE pipeline and generate a
              tamper-evident notarization receipt.
            </p>
            <button
              onClick={openModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#c8f47b] px-4 text-sm font-semibold text-[#0f0f0e] transition hover:bg-[#d4f78e]"
            >
              <span className="text-lg leading-none">+</span>
              Analyze your first contract
            </button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {contracts.map((contract) => {
              const risk = riskStyles[contract.overallRisk] ?? riskStyles.AMBER;
              const highRiskCount = (contract.clauses ?? []).filter(
                (clause) => clause.riskLevel === "HIGH",
              ).length;

              return (
                <Link
                  key={contract.id}
                  href={`/dashboard/${contract.id}`}
                  className="group flex min-h-[220px] flex-col justify-between rounded-lg border border-white/8 bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-[#c8f47b]/30 hover:bg-white/[0.045]"
                >
                  <div>
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-white/35">
                          {formatDate(contract.analyzedAt)}
                        </p>
                        <h2 className="mt-2 break-words text-base font-semibold leading-6 text-white/90 group-hover:text-white">
                          {contract.fileName}
                        </h2>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${risk.badge}`}
                        >
                          {contract.overallRisk}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, contract.id)}
                          disabled={deletingId === contract.id}
                          aria-label={`Delete ${contract.fileName}`}
                          title="Delete analysis"
                          className="rounded-lg border border-white/10 p-1.5 text-white/35 opacity-0 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300 focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 group-hover:opacity-100"
                        >
                          {deletingId === contract.id ? (
                            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300/30 border-t-red-300" />
                          ) : (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 5v6m4-6v6"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="line-clamp-3 text-sm leading-6 text-white/48">
                      {contract.summary}
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/30">
                        Type
                      </p>
                      <p className="mt-1 text-sm text-white/75">
                        {contract.contractType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/30">
                        Clauses
                      </p>
                      <p className="mt-1 text-sm text-white/75">
                        {(contract.clauses ?? []).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/30">
                        Flags
                      </p>
                      <p className="mt-1 text-sm text-white/75">
                        {highRiskCount} high
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-xs text-white/35">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${risk.dot}`} />
                      {risk.label}
                    </span>
                    <span className="text-[#c8f47b]/75 transition group-hover:translate-x-0.5">
                      View analysis
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f0e]/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#141412] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Upload Contract
              </h2>
              <button
                onClick={closeModal}
                disabled={isUploading}
                className="rounded-lg p-1 text-white/40 transition hover:bg-white/5 hover:text-white/70 disabled:opacity-30"
                aria-label="Close upload modal"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {isUploading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#c8f47b]" />
                <p className="text-sm text-white/70">{uploadStage}</p>
                <p className="text-xs text-white/40">
                  Elapsed {elapsed}s · TEE inference is slow, this can take a few
                  minutes
                </p>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".txt,.pdf,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition ${
                    isDragging
                      ? "border-[#c8f47b] bg-[#c8f47b]/5 text-[#c8f47b]"
                      : "border-white/10 bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.035]"
                  }`}
                >
                  <div
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
                      isDragging
                        ? "bg-[#c8f47b] text-[#0f0f0e]"
                        : "bg-white/5 text-white/60"
                    }`}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16V8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1"
                      />
                    </svg>
                  </div>

                  {selectedFile ? (
                    <div className="w-full px-2">
                      <p className="truncate text-sm font-medium text-white">
                        {selectedFile.name}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-white/80">
                        Click to upload or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Supports TXT, PDF, or DOCX
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={closeModal}
                    className="h-10 flex-1 rounded-lg border border-white/10 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!selectedFile}
                    onClick={() => selectedFile && handleUploadSubmit(selectedFile)}
                    className="h-10 flex-1 rounded-lg bg-[#c8f47b] text-sm font-semibold text-[#0f0f0e] transition hover:bg-[#d4f78e] disabled:opacity-40 disabled:hover:bg-[#c8f47b]"
                  >
                    Analyze Contract
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
