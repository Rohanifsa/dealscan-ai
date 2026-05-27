"use client";

import { Plus, RefreshCw } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowList } from "@/features/workflows/components/WorkflowList";
import { CreateWorkflowDialog } from "@/features/workflows/components/CreateWorkflowDialog";
import { useWorkflows } from "@/features/workflows/hooks/useWorkflows";
import { EmailList } from "@/features/email-ingest/components/EmailList";
import { useEmails } from "@/features/email-ingest/hooks/useEmails";

type TabValue = "inbox" | "trades";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab = (searchParams.get("tab") as TabValue | null) ?? "inbox";

  const { data: workflows, isLoading: workflowsLoading } = useWorkflows();
  const {
    data: emails,
    isLoading: emailsLoading,
    refetch: refetchEmails,
  } = useEmails();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const newEmailCount = emails?.filter((e) => e.status === "NEW").length ?? 0;

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      let json: { inserted?: number; fetched?: number; error?: string } = {};
      try {
        json = (await res.json()) as typeof json;
      } catch {
        throw new Error(`Server error (${res.status})`);
      }
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      toast.success(
        `Synced ${json.inserted} new email${json.inserted === 1 ? "" : "s"} (${json.fetched} checked)`,
      );
      refetchEmails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Manage incoming deal emails and your active diligence workflows.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1.5">
            Inbox
            {newEmailCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 min-w-4">
                {newEmailCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trades">Deals</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Emails from your deal inbox appear here.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="gap-1.5"
            >
              <RefreshCw
                className={`size-3.5 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing…" : "Sync Inbox"}
            </Button>
          </div>
          {emailsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : (
            <EmailList emails={emails ?? []} />
          )}
        </TabsContent>

        <TabsContent value="trades" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">My Deals</h2>
              <p className="text-muted-foreground text-sm">
                Track private equity diligence workflows from document intake to IC prep.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 size-4" data-icon="inline-start" />
              New Deal
            </Button>
          </div>

          <CreateWorkflowDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />

          {workflowsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : (
            <WorkflowList workflows={workflows ?? []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
