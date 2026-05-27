export const DOC_TYPE_LABELS = {
  LC: "CIM",
  INVOICE: "Audited Financial Statements",
  BILL_OF_LADING: "Management Accounts / Cap Table",
};

/** Returns a human-readable label for a document type enum value. */
export function formatDocType(type: string): string {
  return (DOC_TYPE_LABELS as Record<string, string>)[type] ?? type;
}
