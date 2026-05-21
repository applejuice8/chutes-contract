"use client";

import { useChutesSession } from "@/hooks/useChutesSession";

export default function Home() {
  const { isLoading, isSignedIn, user, logout } = useChutesSession();

  const handleSignIn = () => {
    window.location.href = "/api/auth/chutes/login";
  };

  // Signed-in state
  if (!isLoading && isSignedIn && user) {
    return (
      <div className="min-h-screen bg-[#0f0f0e] flex items-center justify-center px-4 font-[family-name:var(--font-geist-sans)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#c8f47b]/5 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#c8f47b]/4 blur-[100px]" />
        </div>
        <div className="relative w-full max-w-sm text-center">
          <p className="text-white/40 text-sm mb-2">Signed in as</p>
          <p className="text-white text-lg font-semibold mb-6">
            {user.username}
          </p>
          <button
            onClick={logout}
            className="text-white/40 hover:text-white/70 text-sm underline underline-offset-2 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0e] flex items-center justify-center px-4 font-[family-name:var(--font-geist-sans)]">
      {/* Background texture */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#c8f47b]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#c8f47b]/4 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#c8f47b] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3 4h12M3 8h8M3 12h10"
                stroke="#0f0f0e"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            ChutesContract
          </span>
        </div>

        {/* Tagline above card */}
        <div className="mb-8">
          <h1 className="text-white text-4xl font-bold tracking-tight leading-tight mb-2">
            Welcome back
          </h1>
          <p className="text-[#c8f47b]/80 text-sm font-medium tracking-wide uppercase">
            Trustless AI Contract Analyzer
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <p className="text-white/40 text-sm mb-6">
            Sign in to review and manage your contracts
          </p>

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#c8f47b] hover:bg-[#d4f78e] active:bg-[#b8e86a] disabled:opacity-50 text-[#0f0f0e] font-semibold text-sm rounded-xl h-11 transition-all duration-150 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-[#0f0f0e]/30 border-t-[#0f0f0e] rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M3 4h12M3 8h8M3 12h10"
                  stroke="#0f0f0e"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {isLoading ? "Checking session..." : "Sign in with Chutes"}
          </button>
        </div>
      </div>
    </div>
  );
}
