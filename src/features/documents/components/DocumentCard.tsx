"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, CheckCircle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

import { formatDocType } from "@/features/documents/utils/docTypeLabels";

function toLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "")
    return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean")
    return (
      <span className={value ? "text-green-600" : "text-red-600"}>
        {value ? "Yes" : "No"}
      </span>
    );
  if (typeof value === "number") return <span>{value.toLocaleString()}</span>;
  if (Array.isArray(value)) return <span>{value.join(", ")}</span>;
  if (typeof value === "object")
    return (
      <span className="text-muted-foreground text-xs italic">
        {JSON.stringify(value)}
      </span>
    );
  return <span>{String(value)}</span>;
}

function ExtractedFields({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0)
    return (
      <p className="text-muted-foreground text-xs">No fields extracted.</p>
    );

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-[11px] font-medium">
            {toLabel(key)}
          </span>
          <span className="text-xs break-words">
            <FieldValue value={val} />
          </span>
        </div>
      ))}
    </div>
  );
}

interface DocumentCardProps {
  document: {
    id: string;
    type: string;
    file_name: string;
    extracted_json: Record<string, unknown> | null;
    ocr_repaired: boolean;
    uploaded_at: string;
  };
}

export function DocumentCard({ document }: DocumentCardProps) {
  const isExtracted = !!document.extracted_json;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <CardTitle className="text-sm truncate">
              {document.file_name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">
              {formatDocType(document.type)}
            </Badge>
            {isExtracted ? (
              <Badge
                variant="default"
                className="text-xs bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="size-3 mr-1" />
                Extracted
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Clock className="size-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Uploaded{" "}
          {formatDistanceToNow(new Date(document.uploaded_at), {
            addSuffix: true,
          })}
          {document.ocr_repaired && " · OCR repaired"}
        </p>
      </CardHeader>

      {isExtracted && (
        <CardContent>
          <Accordion>
            <AccordionItem value="fields" className="border-none">
              <AccordionTrigger className="text-xs py-1 hover:no-underline">
                View extracted fields
              </AccordionTrigger>
              <AccordionContent>
                <div className="rounded-md border bg-muted/30 p-3">
                  <ExtractedFields data={document.extracted_json!} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
}
