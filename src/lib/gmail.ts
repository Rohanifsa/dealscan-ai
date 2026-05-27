/**
 * Gmail OAuth2 utilities — uses stored refresh token to get a fresh access token
 * and to call the Gmail REST API.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function getAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to refresh Google access token: ${body}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  payload?: {
    headers?: { name: string; value: string }[];
    parts?: GmailPart[];
    mimeType?: string;
    body?: { data?: string };
  };
  snippet?: string;
  internalDate?: string;
}

interface GmailPart {
  filename?: string;
  mimeType?: string;
  body?: { size?: number; attachmentId?: string };
  parts?: GmailPart[];
}

export async function fetchMessage(
  messageId: string,
  accessToken: string,
): Promise<GmailMessage> {
  const email = encodeURIComponent(process.env.GMAIL_WATCH_EMAIL!);
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${email}/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch Gmail message ${messageId}: ${body}`);
  }

  return res.json() as Promise<GmailMessage>;
}

export async function watchInbox(accessToken: string): Promise<{
  historyId: string;
  expiration: string;
}> {
  const email = encodeURIComponent(process.env.GMAIL_WATCH_EMAIL!);
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${email}/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        labelIds: ["INBOX"],
        topicName: process.env.PUBSUB_TOPIC!,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to set Gmail watch: ${body}`);
  }

  return res.json() as Promise<{ historyId: string; expiration: string }>;
}

/**
 * Extract attachment metadata from a Gmail message payload.
 */
export function extractAttachments(
  msg: GmailMessage,
): {
  filename: string;
  inferred_doc_type: string;
  size?: number;
  attachmentId?: string;
}[] {
  const attachments: {
    filename: string;
    inferred_doc_type: string;
    size?: number;
    attachmentId?: string;
  }[] = [];

  function walkParts(parts: GmailPart[] | undefined) {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.filename.length > 0) {
        attachments.push({
          filename: part.filename,
          inferred_doc_type: inferDocType(part.filename),
          size: part.body?.size,
          attachmentId: part.body?.attachmentId,
        });
      }
      walkParts(part.parts);
    }
  }

  walkParts(msg.payload?.parts);
  return attachments;
}

/**
 * Download the raw bytes of a Gmail message attachment.
 */
export async function downloadAttachment(
  messageId: string,
  attachmentId: string,
  accessToken: string,
): Promise<Buffer> {
  const email = encodeURIComponent(process.env.GMAIL_WATCH_EMAIL!);
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${email}/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to download Gmail attachment: ${body}`);
  }

  const json = (await res.json()) as { data: string; size: number };
  // Gmail uses URL-safe base64 (- → +, _ → /)
  const base64 = json.data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function inferDocType(filename: string): string {
  const upper = filename.toUpperCase();
  if (
    upper.includes("LC") ||
    upper.includes("LETTER_OF_CREDIT") ||
    upper.includes("LETTER OF CREDIT")
  )
    return "LC";
  if (upper.includes("INVOICE") || upper.includes("INV")) return "INVOICE";
  if (
    upper.includes("BOL") ||
    upper.includes("BILL_OF_LADING") ||
    upper.includes("BILL OF LADING") ||
    upper.includes("BL_")
  )
    return "BILL_OF_LADING";
  return "UNKNOWN";
}

export function getHeader(msg: GmailMessage, name: string): string {
  return (
    msg.payload?.headers?.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

/**
 * Fetch all messages in a Gmail thread, in chronological order.
 */
export async function fetchThreadMessages(
  threadId: string,
  accessToken: string,
): Promise<GmailMessage[]> {
  const email = encodeURIComponent(process.env.GMAIL_WATCH_EMAIL!);
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${email}/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch Gmail thread ${threadId}: ${body}`);
  }

  const json = (await res.json()) as { messages?: GmailMessage[] };
  return json.messages ?? [];
}

/**
 * List message IDs in the inbox, newest first.
 */
export async function listMessages(
  accessToken: string,
  maxResults = 25,
): Promise<{ id: string; threadId: string }[]> {
  const email = encodeURIComponent(process.env.GMAIL_WATCH_EMAIL!);
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${email}/messages?labelIds=INBOX&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to list Gmail messages: ${body}`);
  }

  const json = (await res.json()) as {
    messages?: { id: string; threadId: string }[];
  };
  return json.messages ?? [];
}
