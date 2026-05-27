"use client";

import { useWorkflow } from "@/features/workflows/hooks/useWorkflow";
import { WorkflowNav } from "@/features/workflows/components/WorkflowNav";
import { WorkflowStatusBadge } from "@/features/workflows/components/WorkflowStatusBadge";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { use } from "react";

interface WorkflowLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function WorkflowLayout({
  children,
  params,
}: WorkflowLayoutProps) {
  const { id } = use(params);
  const { data: workflow, isLoading } = useWorkflow(id);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "13rem" } as React.CSSProperties}
      className="items-start"
    >
      <WorkflowNav workflowId={id} />
      <SidebarInset className="min-h-0">
        <div className="space-y-6 px-6 py-8">
          <div className="space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-40" />
              </>
            ) : workflow ? (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {workflow.name}
                  </h1>
                  <WorkflowStatusBadge status={workflow.status} />
                </div>
                {workflow.description && (
                  <p className="text-muted-foreground text-sm">
                    {workflow.description}
                  </p>
                )}
              </>
            ) : (
              <h1 className="text-2xl font-bold tracking-tight">Deal</h1>
            )}
          </div>

          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
