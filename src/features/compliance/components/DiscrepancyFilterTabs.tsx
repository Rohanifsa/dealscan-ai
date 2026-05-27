"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export type DiscrepancyFilter = "ALL" | "PENDING" | "REVIEWED";

interface DiscrepancyFilterTabsProps {
  value: DiscrepancyFilter;
  onChange: (value: DiscrepancyFilter) => void;
  counts: Record<DiscrepancyFilter, number>;
}

const TABS: { value: DiscrepancyFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending Review" },
  { value: "REVIEWED", label: "Reviewed" },
];

export function DiscrepancyFilterTabs({
  value,
  onChange,
  counts,
}: DiscrepancyFilterTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DiscrepancyFilter)}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
            {tab.label}
            {counts[tab.value] > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {counts[tab.value]}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
