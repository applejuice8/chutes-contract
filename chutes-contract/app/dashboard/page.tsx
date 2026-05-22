"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useChutesSession } from "@/hooks/useChutesSession";

// Mock contract data for the view
const SAMPLE_CONTRACTS = [
  { id: "1", name: "SmartContract_Audit_v1.sol", date: "May 20, 2026" },
  { id: "2", name: "Token_Vesting_Agreement.pdf", date: "May 18, 2026" },
  { id: "3", name: "LLM_Provider_SLA_Final.docx", date: "May 12, 2026" },
];

export default function Dashboard() {
  const { isLoading, isSignedIn, user, logout } = useChutesSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContractClick = (id: string) => {
    console.log(`Contract ${id} clicked`);
  };

  // Open / Close Modal Logic
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setIsDragging(false);
    setSelectedFile(null);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    // Also check extension as fallbacks for raw system configs
    const extension = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["txt", "pdf", "docx"];

    if (
      validTypes.includes(file.type) ||
      (extension && validExtensions.includes(extension))
    ) {
      setSelectedFile(file);
    } else {
      alert("Invalid file type. Please upload a .txt, .docx, or .pdf file.");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) return;

    console.log("Uploading file to Chutes backend:", selectedFile.name);
    // Add your backend multipart upload or processing dispatch logic here
    // TODO: Hi Colin Parse the File Here

    closeModal();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0e] flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-[#c8f47b]/30 border-t-[#c8f47b] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0e] text-white font-[family-name:var(--font-geist-sans)] relative flex flex-col pt-16">
      {/* Background radial glow spots matching the home page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[#c8f47b]/3 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#c8f47b]/3 blur-[120px]" />
      </div>

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f0f0e]/80 backdrop-blur-md border-b border-white/5 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c8f47b] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path
                d="M3 4h12M3 8h8M3 12h10"
                stroke="#0f0f0e"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="font-semibold text-base tracking-tight text-white">
            ChutesContract
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={logout}
            className="text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex-1 z-10 max-w-5xl w-full mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-[#c8f47b]/80 text-xs font-semibold tracking-wide uppercase mb-1">
            Welcome Back, {user?.username || "Guest"}
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Your Contracts
          </h1>
        </div>

        {/* Contracts Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SAMPLE_CONTRACTS.map((contract) => (
            <div
              key={contract.id}
              onClick={() => handleContractClick(contract.id)}
              className="group text-left bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-xl p-5 backdrop-blur-sm transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[120px]"
            >
              <div>
                <h3 className="text-white/90 group-hover:text-white font-medium text-sm transition-colors break-words line-clamp-2">
                  {contract.name}
                </h3>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.03]">
                <span className="text-white/30 text-xs">{contract.date}</span>
                <svg
                  className="w-4 h-4 stroke-white/20 group-hover:stroke-[#c8f47b] group-hover:translate-x-0.5 transition-all"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Fixed Floating Action Button (FAB) */}
      <button
        onClick={openModal}
        title="Analyze new contract"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#c8f47b] hover:bg-[#d4f78e] active:bg-[#b8e86a] text-[#0f0f0e] rounded-full flex items-center justify-center shadow-lg shadow-[#c8f47b]/5 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="#0f0f0e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Upload File Backdrop & Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f0f0e]/60 backdrop-blur-sm animate-fade-in">
          {/* Modal Card wrapper */}
          <div className="bg-[#141412] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Upload Contract
              </h2>
              <button
                onClick={closeModal}
                className="text-white/40 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
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

            {/* Hidden native input file handle */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.pdf,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
            />

            {/* Drag & Drop Visual Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border border-dashed rounded-xl p-8 text-center transition-all duration-150 cursor-pointer flex flex-col items-center justify-center group ${
                isDragging
                  ? "border-[#c8f47b] bg-[#c8f47b]/5 text-[#c8f47b]"
                  : "border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                  isDragging
                    ? "bg-[#c8f47b] text-[#0f0f0e]"
                    : "bg-white/5 text-white/60 group-hover:text-white"
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
                    d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"
                  />
                </svg>
              </div>

              {selectedFile ? (
                <div className="w-full px-2">
                  <p className="text-white font-medium text-sm truncate mb-1">
                    {selectedFile.name}
                  </p>
                  <p className="text-white/40 text-xs">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-white/80 font-medium text-sm mb-1 group-hover:text-white transition-colors">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-white/40 text-xs">
                    Supports TXT, PDF, or DOCX
                  </p>
                </>
              )}
            </div>

            {/* Action Buttons footer */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 h-10 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!selectedFile}
                onClick={handleUploadSubmit}
                className="flex-1 h-10 rounded-xl bg-[#c8f47b] disabled:opacity-40 disabled:hover:bg-[#c8f47b] hover:bg-[#d4f78e] active:bg-[#b8e86a] text-[#0f0f0e] text-sm font-semibold transition-all cursor-pointer"
              >
                Analyse Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
