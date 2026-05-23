import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Clause,
  getAllContracts,
  getContractById,
  OverallRisk,
  RiskLevel,
} from "@/lib/contractData";

const riskStyles: Record<
  RiskLevel,
  { label: string; pill: string; border: string; text: string }
> = {
  LOW: {
    label: "Low",
    pill: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    border: "border-emerald-400/20",
    text: "text-emerald-200",
  },
  MEDIUM: {
    label: "Medium",
    pill: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    border: "border-amber-300/20",
    text: "text-amber-100",
  },
  HIGH: {
    label: "High",
    pill: "border-red-400/25 bg-red-400/10 text-red-100",
    border: "border-red-400/25",
    text: "text-red-100",
  },
};

const overallStyles: Record<
  OverallRisk,
  { label: string; ring: string; text: string; bg: string }
> = {
  GREEN: {
    label: "GREEN",
    ring: "ring-emerald-400/25",
    text: "text-emerald-200",
    bg: "bg-emerald-400/10",
  },
  AMBER: {
    label: "AMBER",
    ring: "ring-amber-300/25",
    text: "text-amber-100",
    bg: "bg-amber-300/10",
  },
  RED: {
    label: "RED",
    ring: "ring-red-400/25",
    text: "text-red-100",
    bg: "bg-red-400/10",
  },
};

type DetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getAllContracts().map((contract) => ({ id: contract.id }));
}

export default async function ContractDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const contract = getContractById(id);

  if (!contract) {
    notFound();
  }

  const overall = overallStyles[contract.overallRisk];
  const highRiskCount = contract.clauses.filter(
    (clause) => clause.riskLevel === "HIGH",
  ).length;
  const mediumRiskCount = contract.clauses.filter(
    (clause) => clause.riskLevel === "MEDIUM",
  ).length;

  return (
    <main className="relative min-h-screen overflow-y-auto bg-[#0f0f0e] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-[8%] top-[-14rem] h-[28rem] w-[28rem] rounded-full bg-[#c8f47b]/4 blur-3xl" />
        <div className="absolute bottom-[-16rem] left-[20%] h-[26rem] w-[26rem] rounded-full bg-sky-400/4 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8">
        <section className="border-b border-white/5 pb-7">
          <Link
            href="/dashboard"
            className="mb-5 inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white/70"
          >
            <span aria-hidden="true">←</span>
            All contracts
          </Link>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/55">
                  {contract.contractType}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/55">
                  {contract.date}
                </span>
              </div>
              <h1 className="break-words text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {contract.name}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/52">
                {contract.summary}
              </p>
            </div>

            <aside
              className={`rounded-lg border border-white/10 ${overall.bg} p-5 ring-1 ${overall.ring}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                Summary Agent Verdict
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className={`text-4xl font-semibold ${overall.text}`}>
                    {overall.label}
                  </p>
                  <p className="mt-2 text-sm text-white/45">
                    Overall risk score
                  </p>
                </div>
                <div className="text-right text-sm text-white/55">
                  <p>{contract.clauses.length} clauses</p>
                  <p>{highRiskCount} high risk</p>
                  <p>{mediumRiskCount} medium risk</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <Metric label="Document Type" value={contract.contractType} />
          <Metric label="Agents Complete" value="6 / 6" />
          <Metric label="Clauses Flagged" value={`${highRiskCount + mediumRiskCount}`} />
        </section>

        <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c8f47b]/75">
              On-chain pipeline
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Agent analysis trace
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Expand each step to see what Chutes.ai extracted, scored,
              translated, and recommended for this contract.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <PipelineDropdown
              number={1}
              title="Document Parser On-chain"
              kicker="Extracted source material and classified the document"
              defaultOpen
            >
              <div className="grid gap-4 md:grid-cols-3">
                <InfoBlock label="Detected type" value={contract.contractType} />
                <InfoBlock label="Source file" value={contract.name} />
                <InfoBlock
                  label="Parsed clauses"
                  value={`${contract.clauses.length} discrete sections`}
                />
              </div>
              <div className="mt-4 rounded-lg border border-white/8 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
                  Parser notes
                </p>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Chutes.ai identified the file as a {contract.contractType}{" "}
                  contract, normalized the source text, and prepared the
                  clauses for downstream risk analysis.
                </p>
              </div>
            </PipelineDropdown>

            <PipelineDropdown
              number={2}
              title="Clause Extractor On-chain"
              kicker="Segmented the contract into reviewable clause units"
            >
              <div className="grid gap-3">
                {contract.clauses.map((clause) => (
                  <ClauseText key={clause.id} clause={clause} />
                ))}
              </div>
            </PipelineDropdown>

            <PipelineDropdown
              number={3}
              title="Risk Scorer On-chain"
              kicker="Rated each clause and explained the legal concern"
            >
              <div className="grid gap-3">
                {contract.clauses.map((clause) => {
                  const risk = riskStyles[clause.riskLevel];
                  return (
                    <div
                      key={clause.id}
                      className={`rounded-lg border ${risk.border} bg-white/[0.02] p-4`}
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-white/85">
                          {clause.category}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${risk.pill}`}
                        >
                          {risk.label} risk
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-white/55">
                        {clause.riskReason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </PipelineDropdown>

            <PipelineDropdown
              number={4}
              title="Plain-English Translator On-chain"
              kicker="Converted legal wording into direct user impact"
            >
              <div className="grid gap-3">
                {contract.clauses.map((clause) => (
                  <InsightRow
                    key={clause.id}
                    title={clause.category}
                    body={clause.plainEnglish}
                    tone={riskStyles[clause.riskLevel].text}
                  />
                ))}
              </div>
            </PipelineDropdown>

            <PipelineDropdown
              number={5}
              title="Negotiation Advisor On-chain"
              kicker="Generated specific counterparty-ready rewrite guidance"
            >
              <div className="grid gap-3">
                {contract.clauses.map((clause) => (
                  <InsightRow
                    key={clause.id}
                    title={clause.category}
                    body={clause.suggestedRewrite}
                    tone="text-[#c8f47b]"
                  />
                ))}
              </div>
            </PipelineDropdown>

            <PipelineDropdown
              number={6}
              title="Summary Agent On-chain"
              kicker="Compressed clause-level evidence into the final verdict"
            >
              <div className="rounded-lg border border-white/8 bg-black/20 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/30">
                      Final verdict
                    </p>
                    <p className="mt-3 text-base leading-7 text-white/72">
                      {contract.summary}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${overall.bg} ${overall.text} ring-1 ${overall.ring}`}
                  >
                    {contract.overallRisk}
                  </span>
                </div>
              </div>
            </PipelineDropdown>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.025] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white/85">{value}</p>
    </div>
  );
}

function PipelineDropdown({
  number,
  title,
  kicker,
  children,
  defaultOpen = false,
}: {
  number: number;
  title: string;
  kicker: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      id={`stage-${number}`}
      className="group scroll-mt-6 rounded-lg border border-white/8 bg-white/[0.025] [&>summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-white/[0.03]">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c8f47b] text-sm font-bold text-[#0f0f0e]">
            {String(number).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {title}
              </h2>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                Complete
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-white/42">{kicker}</p>
          </div>
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/45 transition group-open:rotate-180 group-hover:border-[#c8f47b]/35 group-hover:text-[#c8f47b]"
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m6 9 6 6 6-6"
            />
          </svg>
        </span>
      </summary>
      <div className="border-t border-white/5 p-5 pt-5">{children}</div>
    </details>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-white/75">
        {value}
      </p>
    </div>
  );
}

function ClauseText({ clause }: { clause: Clause }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/20 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white/85">
          {clause.category}
        </h3>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            riskStyles[clause.riskLevel].pill
          }`}
        >
          {clause.riskLevel}
        </span>
      </div>
      <p className="text-sm leading-6 text-white/50">{clause.text}</p>
    </div>
  );
}

function InsightRow({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/20 p-4">
      <h3 className={`text-sm font-semibold ${tone}`}>{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
    </div>
  );
}
