"use client";

export type DemoWorkflowStatus =
  | "PENDING"
  | "EXTRACTING"
  | "VALIDATING"
  | "HUMAN_REVIEW_REQUIRED"
  | "RESOLVED"
  | "FAILED";

export interface DemoWorkflow {
  id: string;
  name: string;
  description: string | null;
  status: DemoWorkflowStatus;
  created_at: string;
  updated_at: string;
  documents: { count: number }[];
  discrepancies: { count: number }[];
}

export interface DemoDocument {
  id: string;
  workflow_id: string;
  type: string;
  file_name: string;
  extracted_json: Record<string, unknown> | null;
  ocr_repaired: boolean;
  uploaded_at: string;
}

export interface DemoDiscrepancy {
  id: string;
  workflow_id: string;
  field: string;
  ucp_article: string;
  lc_value: string | null;
  document_value: string | null;
  fuzzy_score: number | null;
  rules_verdict: string;
  ai_verdict: string | null;
  severity: string;
  status: string;
  analyst_note: string | null;
  resolved_by?: string | null;
  source_doc?: { id: string; file_name: string; type: string };
  compare_doc?: { id: string; file_name: string; type: string };
}

const WORKFLOWS_KEY = "dealscan.demo.workflows";
const DOCUMENTS_KEY = "dealscan.demo.documents";
const DISCREPANCIES_KEY = "dealscan.demo.discrepancies";
const EVENT_NAME = "dealscan-demo-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT_NAME));
}

function id(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

export function subscribeDemoStore(callback: () => void) {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getDemoDocuments(workflowId: string): DemoDocument[] {
  return read<DemoDocument[]>(DOCUMENTS_KEY, []).filter(
    (doc) => doc.workflow_id === workflowId,
  );
}

export function getDemoDiscrepancies(workflowId: string): DemoDiscrepancy[] {
  return read<DemoDiscrepancy[]>(DISCREPANCIES_KEY, []).filter(
    (item) => item.workflow_id === workflowId,
  );
}

export function getDemoWorkflows(): DemoWorkflow[] {
  const workflows = read<Omit<DemoWorkflow, "documents" | "discrepancies">[]>(
    WORKFLOWS_KEY,
    [],
  );

  return workflows
    .map((workflow) => ({
      ...workflow,
      documents: [{ count: getDemoDocuments(workflow.id).length }],
      discrepancies: [{ count: getDemoDiscrepancies(workflow.id).length }],
    }))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

export function getDemoWorkflow(id: string): DemoWorkflow | null {
  return getDemoWorkflows().find((workflow) => workflow.id === id) ?? null;
}

export function createDemoWorkflow(input: {
  name: string;
  description?: string;
}): DemoWorkflow {
  const now = new Date().toISOString();
  const workflow = {
    id: id("deal"),
    name: input.name,
    description: input.description ?? null,
    status: "PENDING" as DemoWorkflowStatus,
    created_at: now,
    updated_at: now,
  };
  const workflows = read<Omit<DemoWorkflow, "documents" | "discrepancies">[]>(
    WORKFLOWS_KEY,
    [],
  );
  write(WORKFLOWS_KEY, [workflow, ...workflows]);
  return { ...workflow, documents: [{ count: 0 }], discrepancies: [{ count: 0 }] };
}

export function addDemoDocument(input: {
  workflowId: string;
  type: string;
  fileName: string;
}): DemoDocument {
  const fieldsByType: Record<string, Record<string, unknown>> = {
    LC: {
      company_name: "Theobrama Foods Pvt Ltd",
      sector: "Premium bakery and QSR",
      revenue: "INR 182 crore",
      ebitda: "INR 24 crore",
      net_debt: "INR 31 crore",
      customer_concentration: "Top 10 customers: 38%",
      valuation_multiple: "11.0x EBITDA",
    },
    INVOICE: {
      company_name: "Theobrama Foods Pvt Ltd",
      revenue: "INR 169 crore",
      ebitda: "INR 20 crore",
      net_debt: "INR 37 crore",
      gross_margin: "58%",
      capex: "INR 18 crore",
    },
    BILL_OF_LADING: {
      company_name: "Theobrama Foods Pvt Ltd",
      cash_balance: "INR 9 crore",
      debt_balance: "INR 46 crore",
      working_capital: "Inventory days increased from 41 to 64",
      ownership_percentage: "Founders: 62%",
      option_pool: "8% proposed ESOP refresh",
    },
  };

  const doc: DemoDocument = {
    id: id("doc"),
    workflow_id: input.workflowId,
    type: input.type,
    file_name: input.fileName,
    extracted_json: fieldsByType[input.type] ?? {},
    ocr_repaired: false,
    uploaded_at: new Date().toISOString(),
  };

  write(DOCUMENTS_KEY, [...read<DemoDocument[]>(DOCUMENTS_KEY, []), doc]);
  return doc;
}

export function runDemoDiligence(workflowId: string) {
  const docs = getDemoDocuments(workflowId);
  const sourceDoc = docs.find((doc) => doc.type === "LC") ?? docs[0];
  const compareDoc =
    docs.find((doc) => doc.type === "INVOICE") ??
    docs.find((doc) => doc.type === "BILL_OF_LADING") ??
    docs[1] ??
    sourceDoc;

  const findings: DemoDiscrepancy[] = [
    {
      id: id("flag"),
      workflow_id: workflowId,
      field: "revenue",
      ucp_article: "PE DD Check 2.1",
      lc_value: "INR 182 crore in CIM",
      document_value: "INR 169 crore in audited financials",
      fuzzy_score: 72,
      rules_verdict: "FAIL",
      ai_verdict: "FAIL",
      severity: "HIGH",
      status: "DISCREPANCY",
      analyst_note: null,
      source_doc: sourceDoc
        ? { id: sourceDoc.id, file_name: sourceDoc.file_name, type: sourceDoc.type }
        : undefined,
      compare_doc: compareDoc
        ? {
            id: compareDoc.id,
            file_name: compareDoc.file_name,
            type: compareDoc.type,
          }
        : undefined,
    },
    {
      id: id("flag"),
      workflow_id: workflowId,
      field: "net_debt",
      ucp_article: "PE DD Check 3.1",
      lc_value: "INR 31 crore in CIM",
      document_value: "INR 37 crore in financial statements",
      fuzzy_score: 64,
      rules_verdict: "FAIL",
      ai_verdict: "FAIL",
      severity: "MEDIUM",
      status: "DISCREPANCY",
      analyst_note: null,
      source_doc: sourceDoc
        ? { id: sourceDoc.id, file_name: sourceDoc.file_name, type: sourceDoc.type }
        : undefined,
      compare_doc: compareDoc
        ? {
            id: compareDoc.id,
            file_name: compareDoc.file_name,
            type: compareDoc.type,
          }
        : undefined,
    },
    {
      id: id("flag"),
      workflow_id: workflowId,
      field: "working_capital",
      ucp_article: "PE DD Check 4.2",
      lc_value: "Stable working capital profile",
      document_value: "Inventory days increased from 41 to 64",
      fuzzy_score: 58,
      rules_verdict: "FAIL",
      ai_verdict: "FAIL",
      severity: "MEDIUM",
      status: "DISCREPANCY",
      analyst_note: null,
      source_doc: sourceDoc
        ? { id: sourceDoc.id, file_name: sourceDoc.file_name, type: sourceDoc.type }
        : undefined,
      compare_doc: docs.find((doc) => doc.type === "BILL_OF_LADING")
        ? {
            id: docs.find((doc) => doc.type === "BILL_OF_LADING")!.id,
            file_name: docs.find((doc) => doc.type === "BILL_OF_LADING")!
              .file_name,
            type: "BILL_OF_LADING",
          }
        : undefined,
    },
  ];

  const others = read<DemoDiscrepancy[]>(DISCREPANCIES_KEY, []).filter(
    (item) => item.workflow_id !== workflowId,
  );
  write(DISCREPANCIES_KEY, [...others, ...findings]);
  updateDemoWorkflowStatus(workflowId, "HUMAN_REVIEW_REQUIRED");
}

export function updateDemoWorkflowStatus(
  workflowId: string,
  status: DemoWorkflowStatus,
) {
  const workflows = read<Omit<DemoWorkflow, "documents" | "discrepancies">[]>(
    WORKFLOWS_KEY,
    [],
  ).map((workflow) =>
    workflow.id === workflowId
      ? { ...workflow, status, updated_at: new Date().toISOString() }
      : workflow,
  );
  write(WORKFLOWS_KEY, workflows);
}

export function reviewDemoDiscrepancy(input: {
  id: string;
  workflowId: string;
  approved: boolean;
  analystNote?: string;
}) {
  const items = read<DemoDiscrepancy[]>(DISCREPANCIES_KEY, []).map((item) =>
    item.id === input.id
      ? {
          ...item,
          status: input.approved ? "APPROVED" : "DISCREPANCY",
          analyst_note: input.analystNote ?? null,
          resolved_by: "demo-user",
        }
      : item,
  );
  write(DISCREPANCIES_KEY, items);

  const pending = items.some(
    (item) =>
      item.workflow_id === input.workflowId &&
      item.status === "DISCREPANCY" &&
      !item.resolved_by,
  );
  if (!pending) updateDemoWorkflowStatus(input.workflowId, "RESOLVED");
}
