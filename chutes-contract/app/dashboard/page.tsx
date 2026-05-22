"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import Link from "next/link";
import { getAllContracts, OverallRisk } from "@/lib/contractData";
import { useChutesSession } from "@/hooks/useChutesSession";

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

export default function Dashboard() {
  const contracts = getAllContracts();
  const { isLoading, user } = useChutesSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
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

  const handleUploadSubmit = () => {
    if (!selectedFile) return;
    console.log("Uploading file to Chutes backend:", selectedFile.name);
    closeModal();
  };

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
              Open a contract to inspect the six on-chain agent stages, clause
              risks, plain-English translations, and negotiation rewrites.
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

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {contracts.map((contract) => {
            const risk = riskStyles[contract.overallRisk];
            const highRiskCount = contract.clauses.filter(
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
                      <p className="text-xs text-white/35">{contract.date}</p>
                      <h2 className="mt-2 break-words text-base font-semibold leading-6 text-white/90 group-hover:text-white">
                        {contract.name}
                      </h2>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${risk.badge}`}
                    >
                      {contract.overallRisk}
                    </span>
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
                      {contract.clauses.length}
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
                className="rounded-lg p-1 text-white/40 transition hover:bg-white/5 hover:text-white/70"
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
                onClick={handleUploadSubmit}
                className="h-10 flex-1 rounded-lg bg-[#c8f47b] text-sm font-semibold text-[#0f0f0e] transition hover:bg-[#d4f78e] disabled:opacity-40 disabled:hover:bg-[#c8f47b]"
              >
                Analyze Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
