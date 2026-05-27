"use client";

import { useEffect, useState } from "react";
import { getDemoWorkflows, subscribeDemoStore } from "@/lib/demoStore";

export function useWorkflows() {
  const [data, setData] = useState(() => getDemoWorkflows());

  useEffect(
    () => subscribeDemoStore(() => setData(getDemoWorkflows())),
    [],
  );

  return { data, isLoading: false, error: null, refetch: () => setData(getDemoWorkflows()) };
}
