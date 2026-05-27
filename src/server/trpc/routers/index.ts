import { createTRPCRouter } from "@/server/trpc/init";
import { authRouter } from "@/features/auth/server/router";
import { workflowRouter } from "@/features/workflows/server/workflow.router";
import { documentsRouter } from "@/features/documents/server/documents.router";
import { discrepanciesRouter } from "@/features/compliance/server/discrepancies.router";
import { swiftRouter } from "@/features/swift/server/swift.router";
import { auditRouter } from "@/features/audit/server/audit.router";
import { ticketsRouter } from "@/features/tickets/server/tickets.router";
import { emailsRouter } from "@/features/email-ingest/server/emails.router";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  workflows: workflowRouter,
  documents: documentsRouter,
  discrepancies: discrepanciesRouter,
  swift: swiftRouter,
  audit: auditRouter,
  tickets: ticketsRouter,
  emails: emailsRouter,
});

export type AppRouter = typeof appRouter;
