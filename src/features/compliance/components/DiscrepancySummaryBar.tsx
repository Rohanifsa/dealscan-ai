"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

interface DiscrepancySummaryBarProps {
  total: number;
  discrepancies: number;
  reviewed: number;
  riskScore: number;
}

export function DiscrepancySummaryBar({
  total,
  discrepancies,
  reviewed,
  riskScore,
}: DiscrepancySummaryBarProps) {
  const stats = [
    {
      label: "Total Checks",
      value: total,
      icon: TrendingUp,
      className: "text-blue-600",
    },
    {
      label: "Red Flags",
      value: discrepancies,
      icon: AlertTriangle,
      className: "text-red-600",
    },
    {
      label: "Reviewed",
      value: reviewed,
      icon: CheckCircle,
      className: "text-green-600",
    },
    {
      label: "Flag Rate",
      value: `${riskScore}%`,
      icon: TrendingUp,
      className: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, className }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3 p-4">
            <Icon className={`size-5 shrink-0 ${className}`} />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium">
                {label}
              </p>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
