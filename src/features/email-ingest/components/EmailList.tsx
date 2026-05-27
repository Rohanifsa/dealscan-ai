"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { EmailCard, type EmailEvent } from "./EmailCard";

type FilterValue = "all" | "new" | "ignored";

interface EmailListProps {
  emails: EmailEvent[];
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "ignored", label: "Ignored" },
];

const EMPTY_MESSAGES: Record<
  FilterValue,
  { title: string; description: string }
> = {
  all: {
    title: "No emails yet",
    description:
      "Deal-related emails forwarded to DealScan will appear here.",
  },
  new: {
    title: "No new emails",
    description:
      "All caught up! New deal emails will appear here as they arrive.",
  },
  ignored: {
    title: "Nothing ignored",
    description: "Emails you ignore will appear here.",
  },
};

function filterEmails(emails: EmailEvent[], filter: FilterValue): EmailEvent[] {
  if (filter === "all") return emails;
  if (filter === "new") return emails.filter((e) => e.status === "NEW");
  return emails.filter((e) => e.status === "IGNORED");
}

export function EmailList({ emails }: EmailListProps) {
  const [filter, setFilter] = useState<FilterValue>("new");

  const newCount = emails.filter((e) => e.status === "NEW").length;
  const ignoredCount = emails.filter((e) => e.status === "IGNORED").length;

  const counts: Record<FilterValue, number> = {
    all: emails.length,
    new: newCount,
    ignored: ignoredCount,
  };

  const filtered = filterEmails(emails, filter);
  const emptyMsg = EMPTY_MESSAGES[filter];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        {FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            variant={filter === value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter(value)}
            className="gap-1.5"
          >
            {label}
            {counts[value] > 0 && (
              <Badge
                variant={filter === value ? "default" : "outline"}
                className="text-[10px] px-1.5 py-0 h-4 min-w-4"
              >
                {counts[value]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{emptyMsg.title}</EmptyTitle>
            <EmptyDescription>{emptyMsg.description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((email) => (
            <EmailCard key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
}
