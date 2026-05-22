'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAllContracts } from '@/lib/contractData';
import type { Contract } from '@/lib/contractData';
import { useChutesSession } from '@/hooks/useChutesSession';

const riskColor: Record<string, string> = {
  GREEN: '#4ade80',
  AMBER: '#fbbf24',
  RED: '#ef4444',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const contracts = getAllContracts();
  const pathname = usePathname();
  const { logout } = useChutesSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f0f0e] flex">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-white transition-colors"
        aria-label="Open sidebar"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={`
          w-[280px] bg-[#0a0a09] border-r border-white/5 flex flex-col h-screen sticky top-0
          fixed inset-y-0 left-0 z-40 transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#c8f47b] flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#0f0f0e"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 4l6-2 6 2v6l-6 4-6-4V4z" />
                <path d="M8 6v6" />
              </svg>
            </div>
            <span className="text-white/90 font-semibold text-sm tracking-tight">
              ChutesContract
            </span>
          </div>

          <Link
            href="/dashboard"
            className="w-full mt-4 h-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/60 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            New Analysis
            <span className="text-base leading-none">+</span>
          </Link>
        </div>

        {/* Contract list */}
        <div className="flex-1 overflow-y-auto py-3">
          <p className="px-5 text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">
            Your Contracts
          </p>

          <nav className="flex flex-col gap-0.5">
            {contracts.map((contract: Contract) => {
              const isActive = pathname === `/dashboard/${contract.id}`;
              return (
                <Link
                  key={contract.id}
                  href={`/dashboard/${contract.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    block px-4 py-3 mx-2 rounded-lg transition-all duration-150
                    ${
                      isActive
                        ? 'bg-white/[0.06] border-l-2 border-[#c8f47b]'
                        : 'hover:bg-white/[0.03]'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          riskColor[contract.overallRisk] ?? riskColor.GREEN,
                      }}
                    />
                    <span className="text-sm text-white/80 truncate">
                      {contract.name}
                    </span>
                  </div>
                  <p className="text-xs text-white/30 mt-1 ml-4">
                    {contract.date}
                  </p>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={logout}
            className="text-white/30 hover:text-white/60 text-xs transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {children}
      </div>
    </div>
  );
}
