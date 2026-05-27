"use client";

import { use } from "react";
import { useSwiftMessages } from "@/features/swift/hooks/useSwiftMessages";
import { SwiftMessageList } from "@/features/swift/components/SwiftMessageList";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SwiftPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: messages, isLoading } = useSwiftMessages(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Discrepancy Emails</h2>
        <p className="text-muted-foreground text-sm">
          Review, edit, and send discrepancy notification emails to
          correspondents.
        </p>
      </div>

      {(messages?.length ?? 0) === 0 && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            Emails are generated automatically after discrepancies are
            identified during review.
          </AlertDescription>
        </Alert>
      )}

      <SwiftMessageList messages={messages ?? []} workflowId={id} />
    </div>
  );
}
