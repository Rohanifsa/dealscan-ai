"use client";

import { useEffect, useState } from "react";
import { getDemoDiscrepancies, subscribeDemoStore } from "@/lib/demoStore";

export function useDiscrepancies(workflowId: string) {
  const [data, setData] = useState(() => getDemoDiscrepancies(workflowId));

  useEffect(
    () =>
      subscribeDemoStore(() => setData(getDemoDiscrepancies(workflowId))),
    [workflowId],
  );

  return { data, isLoading: false, error: null, refetch: () => setData(getDemoDiscrepancies(workflowId)) };
}
