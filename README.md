# DealScan AI

DealScan AI is an AI-powered private equity due diligence workspace. It helps an investment team ingest deal documents, extract key financial and ownership data, identify red flags, and prepare management queries or investment committee material.

## Assignment Fit

The tool improves efficiency across the investment lifecycle:

- Deal screening: creates a structured deal room for each target.
- Due diligence: reads CIMs, audited financial statements, management accounts, and cap tables.
- Valuation support: extracts revenue, EBITDA, net debt, margins, capex, and ownership assumptions.
- IC preparation: turns findings into clear diligence red flags and memo-ready explanations.
- Deal execution: generates professional management query drafts for unresolved issues.

## Core Workflow

1. Create a deal room for a target company.
2. Upload the CIM, financial statements, and management accounts or cap table.
3. AI extracts key metrics and operating details from each PDF.
4. A rules-plus-AI review compares disclosures across documents.
5. Red flags are ranked by severity for human review.
6. DealScan AI drafts management queries and helps the user explain findings.

## Tech Stack

- Next.js
- React
- TypeScript
- Supabase
- Inngest
- Gemini via AI SDK
- Tailwind CSS and shadcn-style components

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deployment

This is a standard Next.js app and can be deployed on Vercel. The public homepage is designed to work as a submission demo, while the authenticated dashboard requires the Supabase, Gemini, Inngest, email, and storage environment variables used by the full workflow.
