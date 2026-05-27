"use client";

import { use } from "react";
import Link from "next/link";
import { useWorkflow } from "@/features/workflows/hooks/useWorkflow";
import { useDocuments } from "@/features/documents/hooks/useDocuments";
import { useDiscrepancies } from "@/features/compliance/hooks/useDiscrepancies";
import { WorkflowStatusBadge } from "@/features/workflows/components/WorkflowStatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PieChart, Pie, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const fieldConfig = {
  matched: { label: "Matched", color: "var(--chart-2)" },
  mismatched: { label: "Mismatched", color: "var(--chart-4)" },
} satisfies ChartConfig;

const pairConfig = {
  lcInvoice: { label: "CIM vs Financials", color: "var(--chart-1)" },
  lcBol: { label: "CIM vs Management Accounts", color: "var(--chart-3)" },
} satisfies ChartConfig;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WorkflowOverviewPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: workflow, isLoading } = useWorkflow(id);
  const { data: documents } = useDocuments(id);
  const { data: discrepancies } = useDiscrepancies(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!workflow) return null;

  const discrepancyCount =
    discrepancies?.filter((d) => d.status === "DISCREPANCY").length ?? 0;
  const approvedCount =
    discrepancies?.filter((d) => d.status === "APPROVED").length ?? 0;
  const totalDiscrepancies = discrepancies?.length ?? 0;
  const docCount = documents?.length ?? 0;

  // Chart 1: matched vs mismatched fields
  const fieldChartData = [
    {
      name: "matched",
      label: "Matched",
      value: approvedCount,
      fill: "var(--color-matched)",
    },
    {
      name: "mismatched",
      label: "Mismatched",
      value: discrepancyCount,
      fill: "var(--color-mismatched)",
    },
  ];

  // Chart 2: comparison pair breakdown across PE diligence documents
  const lcInvoiceCount =
    discrepancies?.filter((d: any) => d.compare_doc?.type === "INVOICE")
      .length ?? 0;
  const lcBolCount =
    discrepancies?.filter((d: any) => d.compare_doc?.type === "BILL_OF_LADING")
      .length ?? 0;
  const pairChartData = [
    {
      name: "lcInvoice",
      label: "CIM vs Financials",
      value: lcInvoiceCount,
      fill: "var(--color-lcInvoice)",
    },
    {
      name: "lcBol",
      label: "CIM vs Management Accounts",
      value: lcBolCount,
      fill: "var(--color-lcBol)",
    },
  ];

  const nextStep = (() => {
    if (workflow.status === "PENDING")
      return { label: "Upload Deal Documents", href: `/workflow/${id}/documents` };
    if (workflow.status === "HUMAN_REVIEW_REQUIRED")
      return { label: "Review Red Flags", href: `/workflow/${id}/review` };
    if (workflow.status === "RESOLVED")
      return { label: "View Management Queries", href: `/workflow/${id}/tickets` };
    return null;
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 pt-0">
            <FileText className="text-muted-foreground size-8" />
            <div>
              <p className="text-3xl font-bold">{docCount}</p>
              <p className="text-muted-foreground text-xs">uploaded</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 pt-0">
            <AlertTriangle
              className={`size-8 ${totalDiscrepancies > 0 ? "text-amber-500" : "text-muted-foreground"}`}
            />
            <div>
              <p className="text-3xl font-bold">{totalDiscrepancies}</p>
              <p className="text-muted-foreground text-xs">
                {discrepancyCount > 0 ? `${discrepancyCount} need review` : "found"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 pt-0">
            {workflow.status === "RESOLVED" ? (
              <CheckCircle className="size-8 text-green-500" />
            ) : (
              <Clock className="text-muted-foreground size-8" />
            )}
            <div>
              <WorkflowStatusBadge status={workflow.status as any} />
              <p className="text-muted-foreground mt-1 text-xs">
                Created{" "}
                {formatDistanceToNow(new Date(workflow.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {nextStep && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm font-medium">Next step</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-muted-foreground text-sm">{nextStep.label}</p>
            <Link href={nextStep.href}>
              <Button size="sm">
                {nextStep.label}
                <ArrowRight
                  className="ml-1.5 size-3.5"
                  data-icon="inline-end"
                />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Field verification donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diligence Checks</CardTitle>
            <CardDescription>
              {totalDiscrepancies} checks run — cleared vs flagged
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalDiscrepancies === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No checks run yet
              </div>
            ) : (
              <>
                <ChartContainer
                  config={fieldConfig}
                  className="mx-auto aspect-square max-h-48"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent nameKey="label" hideLabel />
                      }
                    />
                    <Pie
                      data={fieldChartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      strokeWidth={2}
                    >
                      {fieldChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 flex justify-center gap-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: "var(--color-matched)" }}
                    />
                    Cleared ({approvedCount})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: "var(--color-mismatched)" }}
                    />
                    Flagged ({discrepancyCount})
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Comparison pair breakdown donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Coverage</CardTitle>
            <CardDescription>Diligence checks by document pair</CardDescription>
          </CardHeader>
          <CardContent>
            {lcInvoiceCount + lcBolCount === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No comparisons run yet
              </div>
            ) : (
              <>
                <ChartContainer
                  config={pairConfig}
                  className="mx-auto aspect-square max-h-48"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent nameKey="label" hideLabel />
                      }
                    />
                    <Pie
                      data={pairChartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      strokeWidth={2}
                    >
                      {pairChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 flex justify-center gap-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: "var(--color-lcInvoice)" }}
                    />
                    CIM vs Financials ({lcInvoiceCount})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: "var(--color-lcBol)" }}
                    />
                    CIM vs Management ({lcBolCount})
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
