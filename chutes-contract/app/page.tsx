"use client";
export default function Home() {
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

          {/* Sign in with Chutes button */}
          <button
            onClick={() => {
              /* redirect to Chutes OAuth */
            }}
            className="w-full flex items-center justify-center gap-3 bg-[#c8f47b] hover:bg-[#d4f78e] active:bg-[#b8e86a] text-[#0f0f0e] font-semibold text-sm rounded-xl h-11 transition-all duration-150 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3 4h12M3 8h8M3 12h10"
                stroke="#0f0f0e"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Sign in with Chutes
          </button>
        </div>
      </div>
    </div>
  );
}