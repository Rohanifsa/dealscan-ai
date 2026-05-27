"use client";

import { toast } from "sonner";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { runDemoDiligence } from "@/lib/demoStore";
import { useState } from "react";

interface TriggerProcessingButtonProps {
  workflowId: string;
  hasAllDocTypes: boolean;
}

export function TriggerProcessingButton({
  workflowId,
  hasAllDocTypes,
}: TriggerProcessingButtonProps) {
  const [isPending, setIsPending] = useState(false);

  function handleRun() {
    setIsPending(true);
    runDemoDiligence(workflowId);
    setIsPending(false);
    toast.success("Diligence review complete. Red flags generated.");
  }

  return (
    <Button
      onClick={handleRun}
      disabled={!hasAllDocTypes || isPending}
      size="lg"
    >
      {isPending ? (
        <Spinner className="mr-2 size-4" data-icon="inline-start" />
      ) : (
        <Zap className="mr-2 size-4" data-icon="inline-start" />
      )}
      {isPending ? "Starting..." : "Start Diligence Review"}
    </Button>
  );
}
