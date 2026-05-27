"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { CreateWorkflowDialog } from "@/features/workflows/components/CreateWorkflowDialog";
import { useState } from "react";

export default function NewWorkflowPage() {
  const [open, setOpen] = useState(true);

  return (
    <CreateWorkflowDialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          window.location.href = "/dashboard";
        }
      }}
    />
  );
}
