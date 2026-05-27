"use client";

import { DocumentCard } from "./DocumentCard";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

interface DocumentListProps {
  documents: Parameters<typeof DocumentCard>[0]["document"][];
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No documents yet</EmptyTitle>
          <EmptyDescription>
            Upload the CIM, audited financial statements, and management accounts or cap table to get
            started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
