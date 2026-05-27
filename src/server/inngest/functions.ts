// Export all Inngest functions here
// Example: export { onUserSignup } from "@/features/auth/server/inngest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import {
  extractDocuments,
  runCompliance,
  generateTickets,
} from "@/features/processing/inngest";
import { renewGmailWatch } from "@/features/email-ingest/inngest/renewGmailWatch";

export const functions = [
  extractDocuments,
  runCompliance,
  generateTickets,
  renewGmailWatch,
];
