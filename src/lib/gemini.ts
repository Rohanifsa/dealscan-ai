import { google } from "@ai-sdk/google";

/**
 * Gemini 2.5 Flash-Lite model instance via Vercel AI SDK.
 * Used in all Inngest processing functions.
 */
export const flashLite = google("gemini-3.1-flash-lite-preview");
