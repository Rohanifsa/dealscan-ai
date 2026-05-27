"use client";

import { toast } from "sonner";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/provider";

interface TriggerProcessingButtonProps {
  workflowId: string;
  hasAllDocTypes: boolean;
}

export function TriggerProcessingButton({
  workflowId,
  hasAllDocTypes,
}: TriggerProcessingButtonProps) {
  const utils = trpc.useUtils();

  const triggerMutation = trpc.documents.triggerProcessing.useMutation({
    onSuccess: () => {
      utils.workflows.getById.invalidate({ id: workflowId });
      toast.success("Diligence review started! The AI pipeline is now running.");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Button
      onClick={() => triggerMutation.mutate({ workflowId })}
      disabled={!hasAllDocTypes || triggerMutation.isPending}
      size="lg"
    >
      {triggerMutation.isPending ? (
        <Spinner className="mr-2 size-4" data-icon="inline-start" />
      ) : (
        <Zap className="mr-2 size-4" data-icon="inline-start" />
      )}
      {triggerMutation.isPending ? "Starting..." : "Start Diligence Review"}
    </Button>
  );
}
