"use client";

import { use } from "react";
import { useDocuments } from "@/features/documents/hooks/useDocuments";
import { useWorkflow } from "@/features/workflows/hooks/useWorkflow";
import { DocumentUploader } from "@/features/documents/components/DocumentUploader";
import { DocumentList } from "@/features/documents/components/DocumentList";
import { TriggerProcessingButton } from "@/features/documents/components/TriggerProcessingButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const REQUIRED_TYPES = ["LC", "INVOICE", "BILL_OF_LADING"] as const;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DocumentsPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: workflow, isLoading: workflowLoading } = useWorkflow(id);
  const { data: documents, isLoading: docsLoading } = useDocuments(id);

  const isProcessing =
    workflow?.status === "EXTRACTING" || workflow?.status === "VALIDATING";

  const isPending = workflow?.status === "PENDING";

  const uploadedTypes = new Set(documents?.map((d) => d.type) ?? []);
  const hasAllDocTypes = REQUIRED_TYPES.every((t) => uploadedTypes.has(t));

  if (workflowLoading || docsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isPending && (
        <>
          <DocumentUploader workflowId={id} />
          <Separator />
        </>
      )}

      {isProcessing && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            Processing is underway. The AI pipeline is extracting and validating
            the deal documents — this may take a few minutes.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Uploaded Documents</h2>
          {isPending && (
            <TriggerProcessingButton
              workflowId={id}
              hasAllDocTypes={hasAllDocTypes}
            />
          )}
        </div>

        {!hasAllDocTypes && isPending && (
          <p className="text-muted-foreground text-xs">
            Upload a CIM, audited financial statements, and management accounts
            or cap table to start processing.
          </p>
        )}

        <DocumentList documents={documents ?? []} />
      </div>
    </div>
  );
}
