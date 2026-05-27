export type DocType = "LC" | "INVOICE" | "BILL_OF_LADING";
export type SeverityLevel = "HIGH" | "MEDIUM" | "LOW";

export interface UcpRule {
  field: string;
  ucpArticle: string;
  sourceDocType: DocType;
  compareDocType: DocType;
  severity: SeverityLevel;
}

export const ucpRules: UcpRule[] = [
  // HIGH severity — CIM vs audited financial statements
  {
    field: "company_name",
    ucpArticle: "PE DD Check 1.1",
    sourceDocType: "LC",
    compareDocType: "INVOICE",
    severity: "HIGH",
  },
  {
    field: "revenue",
    ucpArticle: "PE DD Check 2.1",
    sourceDocType: "LC",
    compareDocType: "INVOICE",
    severity: "HIGH",
  },
  {
    field: "ebitda",
    ucpArticle: "PE DD Check 2.2",
    sourceDocType: "LC",
    compareDocType: "INVOICE",
    severity: "HIGH",
  },
  {
    field: "net_debt",
    ucpArticle: "PE DD Check 3.1",
    sourceDocType: "LC",
    compareDocType: "INVOICE",
    severity: "HIGH",
  },
  {
    field: "reporting_period",
    ucpArticle: "PE DD Check 2.3",
    sourceDocType: "LC",
    compareDocType: "INVOICE",
    severity: "HIGH",
  },
  {
    field: "currency",
    ucpArticle: "PE DD Check 2.4",
    sourceDocType: "LC",
    compareDocType: "INVOICE",
    severity: "HIGH",
  },
  // MEDIUM severity — CIM vs audited financial statements
  {
    field: "gross_margin",
    ucpArticle: "PE DD Check 2.5",
    sourceDocType: "LC",
    compareDocType: "INVOICE",
    severity: "MEDIUM",
  },
  {
    field: "capex",
    ucpArticle: "PE DD Check 2.6",
    sourceDocType: "LC",
    compareDocType: "INVOICE",
    severity: "MEDIUM",
  },
  // HIGH severity — CIM vs management accounts / cap table
  {
    field: "cash_balance",
    ucpArticle: "PE DD Check 3.2",
    sourceDocType: "LC",
    compareDocType: "BILL_OF_LADING",
    severity: "HIGH",
  },
  {
    field: "debt_balance",
    ucpArticle: "PE DD Check 3.3",
    sourceDocType: "LC",
    compareDocType: "BILL_OF_LADING",
    severity: "HIGH",
  },
  // MEDIUM severity — CIM vs management accounts / cap table
  {
    field: "customer_concentration",
    ucpArticle: "PE DD Check 4.1",
    sourceDocType: "LC",
    compareDocType: "BILL_OF_LADING",
    severity: "MEDIUM",
  },
  {
    field: "working_capital",
    ucpArticle: "PE DD Check 4.2",
    sourceDocType: "LC",
    compareDocType: "BILL_OF_LADING",
    severity: "MEDIUM",
  },
  {
    field: "ownership_percentage",
    ucpArticle: "PE DD Check 5.1",
    sourceDocType: "LC",
    compareDocType: "BILL_OF_LADING",
    severity: "MEDIUM",
  },
  {
    field: "option_pool",
    ucpArticle: "PE DD Check 5.2",
    sourceDocType: "LC",
    compareDocType: "BILL_OF_LADING",
    severity: "MEDIUM",
  },
  // LOW severity — CIM vs management accounts / cap table
  {
    field: "management_guidance",
    ucpArticle: "PE DD Check 6.1",
    sourceDocType: "LC",
    compareDocType: "BILL_OF_LADING",
    severity: "LOW",
  },
  {
    field: "transaction_assumptions",
    ucpArticle: "PE DD Check 6.2",
    sourceDocType: "LC",
    compareDocType: "BILL_OF_LADING",
    severity: "LOW",
  },
];
