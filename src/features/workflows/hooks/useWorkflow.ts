"use client";

import { useEffect, useState } from "react";
import { getDemoWorkflow, subscribeDemoStore } from "@/lib/demoStore";

export function useWorkflow(id: string) {
  const [data, setData] = useState(() => getDemoWorkflow(id));

  useEffect(
    () => subscribeDemoStore(() => setData(getDemoWorkflow(id))),
    [id],
  );

  return { data, isLoading: false, error: null, refetch: () => setData(getDemoWorkflow(id)) };
}
