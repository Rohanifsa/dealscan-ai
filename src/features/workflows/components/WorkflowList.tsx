"use client";

import { WorkflowCard } from "./WorkflowCard";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

interface WorkflowListProps {
  workflows: Parameters<typeof WorkflowCard>[0]["workflow"][];
}

export function WorkflowList({ workflows }: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No deals yet</EmptyTitle>
          <EmptyDescription>
            Create your first deal room to start processing private equity
            diligence documents.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow) => (
        <WorkflowCard key={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
}
