import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  FileText,
  MessageSquareText,
  TrendingUp,
} from "lucide-react";

const pipeline = [
  {
    title: "Deal Intake",
    description: "Ingest CIMs, audited financials, cap tables, and lender packs.",
    icon: FileText,
  },
  {
    title: "AI Extraction",
    description: "Pull revenue, EBITDA, debt, customer concentration, and ownership data.",
    icon: FileSearch,
  },
  {
    title: "Red Flag Review",
    description: "Compare disclosures across documents and rank diligence issues by severity.",
    icon: AlertTriangle,
  },
  {
    title: "IC Prep",
    description: "Generate investment committee queries, findings, and memo-ready summaries.",
    icon: ClipboardList,
  },
];

const findings = [
  {
    label: "Revenue bridge mismatch",
    source: "CIM vs audited financials",
    severity: "High",
    detail: "FY25 revenue in the CIM is 8.4% above audited statements.",
  },
  {
    label: "Working capital pressure",
    source: "Management accounts",
    severity: "Medium",
    detail: "Inventory days expanded from 42 to 67 during the latest quarter.",
  },
  {
    label: "Founder dilution risk",
    source: "Cap table",
    severity: "Medium",
    detail: "ESOP refresh could reduce sponsor ownership by 3.1% post-close.",
  },
];

const metrics = [
  { value: "72%", label: "faster first-pass diligence" },
  { value: "14", label: "financial checks automated" },
  { value: "3", label: "IC outputs generated" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18211c]">
      <section className="border-b border-[#d8ded4] bg-[#eef3ea]">
        <div className="mx-auto grid min-h-[92svh] max-w-7xl gap-10 px-5 py-8 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:px-10">
          <div className="flex flex-col justify-center gap-8">
            <Link
              href="/dashboard"
              className="flex w-fit items-center gap-2 text-sm font-semibold"
            >
              <BriefcaseBusiness className="size-5 text-[#286140]" />
              DealScan AI
            </Link>

            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5f6f64]">
                Private equity diligence automation
              </p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-normal md:text-6xl">
                DealScan AI
              </h1>
              <p className="max-w-xl text-lg leading-8 text-[#4d5d52]">
                An AI analyst for private equity teams that reads deal documents,
                detects diligence red flags, and prepares investment committee
                workstreams in minutes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#286140] px-5 text-sm font-semibold text-white transition hover:bg-[#214f35]"
              >
                Open Workspace
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#workflow"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#aab7a7] bg-white px-5 text-sm font-semibold transition hover:bg-[#f3f6f1]"
              >
                View Workflow
              </a>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-[#d8ded4] bg-white p-4"
                >
                  <p className="text-2xl font-semibold text-[#286140]">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#5f6f64]">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-lg border border-[#ccd5c8] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#e3e8df] px-5 py-4">
                <div>
                  <p className="text-sm font-semibold">Target: Winn Foods</p>
                  <p className="text-xs text-[#66736a]">
                    Buyout diligence workspace
                  </p>
                </div>
                <span className="rounded-md bg-[#f4c95d]/25 px-2.5 py-1 text-xs font-semibold text-[#735800]">
                  Human review
                </span>
              </div>

              <div className="grid gap-0 md:grid-cols-[1fr_1.15fr]">
                <div className="border-b border-[#e3e8df] p-5 md:border-b-0 md:border-r">
                  <p className="mb-4 text-sm font-semibold">Document Room</p>
                  <div className="space-y-3">
                    {["CIM", "Audited Financials", "Management Accounts", "Cap Table"].map(
                      (doc) => (
                        <div
                          key={doc}
                          className="flex items-center justify-between rounded-md border border-[#e3e8df] p-3"
                        >
                          <span className="text-sm">{doc}</span>
                          <CheckCircle2 className="size-4 text-[#286140]" />
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-5 rounded-md bg-[#f3f6f1] p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4 text-[#286140]" />
                      <p className="text-sm font-semibold">Valuation Snapshot</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[#66736a]">Adj. EBITDA</p>
                        <p className="font-semibold">$18.6m</p>
                      </div>
                      <div>
                        <p className="text-[#66736a]">Entry Multiple</p>
                        <p className="font-semibold">9.2x</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <p className="mb-4 text-sm font-semibold">
                    AI Diligence Findings
                  </p>
                  <div className="space-y-3">
                    {findings.map((finding) => (
                      <div
                        key={finding.label}
                        className="rounded-md border border-[#e3e8df] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {finding.label}
                            </p>
                            <p className="mt-1 text-xs text-[#66736a]">
                              {finding.source}
                            </p>
                          </div>
                          <span className="rounded-md bg-[#e85d75]/10 px-2 py-1 text-xs font-semibold text-[#a02c42]">
                            {finding.severity}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#4d5d52]">
                          {finding.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5f6f64]">
              Investment lifecycle coverage
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              From deal screening to IC memo
            </h2>
          </div>
          <BadgeCheck className="hidden size-10 text-[#286140] md:block" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {pipeline.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-lg border border-[#d8ded4] bg-white p-5"
              >
                <Icon className="size-5 text-[#286140]" />
                <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f6f64]">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-[#d8ded4] bg-white p-6">
            <TrendingUp className="size-5 text-[#286140]" />
            <h3 className="mt-4 text-lg font-semibold">
              Practical PE impact
            </h3>
            <p className="mt-2 text-sm leading-7 text-[#5f6f64]">
              Deal teams spend less time reconciling static documents and more
              time judging the investment. The tool creates a repeatable first
              diligence pass across sourcing, screening, diligence, valuation,
              committee preparation, and execution follow-up.
            </p>
          </div>
          <div className="rounded-lg border border-[#d8ded4] bg-white p-6">
            <MessageSquareText className="size-5 text-[#286140]" />
            <h3 className="mt-4 text-lg font-semibold">AI co-pilot outputs</h3>
            <p className="mt-2 text-sm leading-7 text-[#5f6f64]">
              The assistant explains findings, drafts management queries,
              summarizes document evidence, and converts reviewed red flags into
              IC-ready bullets with source traceability.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
