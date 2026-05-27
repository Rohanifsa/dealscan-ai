"use client";

import { trpc } from "@/lib/trpc/provider";

export function useEmails() {
  return trpc.emails.getAll.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30s until Gmail push is wired
  });
}
