"use client";

import { useEffect, useState } from "react";
import { getDemoDocuments, subscribeDemoStore } from "@/lib/demoStore";

export function useDocuments(workflowId: string) {
  const [data, setData] = useState(() => getDemoDocuments(workflowId));

  useEffect(
    () => subscribeDemoStore(() => setData(getDemoDocuments(workflowId))),
    [workflowId],
  );

  return { data, isLoading: false, error: null, refetch: () => setData(getDemoDocuments(workflowId)) };
}
