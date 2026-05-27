"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { addDemoDocument } from "@/lib/demoStore";

import { DOC_TYPE_LABELS } from "@/features/documents/utils/docTypeLabels";

type DocType = keyof typeof DOC_TYPE_LABELS;

interface DocumentUploaderProps {
  workflowId: string;
  onUploaded?: () => void;
}

export function DocumentUploader({
  workflowId,
  onUploaded,
}: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType | "">("");
  const [dragging, setDragging] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function handleUpload() {
    if (!file || !docType) return;
    setIsPending(true);
    addDemoDocument({
      workflowId,
      type: docType,
      fileName: file.name,
    });
    setFile(null);
    setDocType("");
    setIsPending(false);
    toast.success("Document uploaded and demo fields extracted.");
    onUploaded?.();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
          p-10 text-center cursor-pointer transition-colors
          ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
        `}
      >
        <Upload className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {file ? file.name : "Drop a PDF here, or click to browse"}
        </p>
        {!file && (
          <p className="text-xs text-muted-foreground">Supports PDF files</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Type selector + upload button */}
      <FieldGroup>
        <Field>
          <FieldLabel>Document Type</FieldLabel>
          <Select
            value={docType}
            onValueChange={(v) => setDocType(v as DocType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select document type..." />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {DOC_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <Button
        onClick={handleUpload}
        disabled={!file || !docType || isPending}
        className="w-full"
      >
        {isPending ? (
          <Spinner className="mr-2 size-4" data-icon="inline-start" />
        ) : (
          <FileText className="mr-2 size-4" data-icon="inline-start" />
        )}
        {isPending ? "Uploading..." : "Upload Document"}
      </Button>
    </div>
  );
}
