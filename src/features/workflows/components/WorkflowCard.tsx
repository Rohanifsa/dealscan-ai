"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FileText, AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { WorkflowStatusBadge } from "./WorkflowStatusBadge";

interface WorkflowCardProps {
  workflow: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    documents: { count: number }[];
    discrepancies: { count: number }[];
  };
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const docCount = workflow.documents?.[0]?.count ?? 0;
  const discCount = workflow.discrepancies?.[0]?.count ?? 0;

  return (
    <Link href={`/workflow/${workflow.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">
              {workflow.name}
            </CardTitle>
            <WorkflowStatusBadge
              status={
                workflow.status as Parameters<
                  typeof WorkflowStatusBadge
                >[0]["status"]
              }
            />
          </div>
          {workflow.description && (
            <CardDescription className="line-clamp-2">
              {workflow.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="size-3.5" />
              {docCount} {docCount === 1 ? "document" : "documents"}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="size-3.5" />
              {discCount} {discCount === 1 ? "red flag" : "red flags"}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Created{" "}
            {formatDistanceToNow(new Date(workflow.created_at), {
              addSuffix: true,
            })}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}
