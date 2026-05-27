import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import {
  getAccessToken,
  fetchMessage,
  extractAttachments,
  getHeader,
} from "@/lib/gmail";

/**
 * POST /api/webhooks/gmail
 *
 * Receives Pub/Sub push messages from Google. The body is a standard
 * Pub/Sub Push envelope:
 * {
 *   message: {
 *     data: base64(JSON.stringify({ emailAddress, historyId })),
 *     messageId: string,
 *     publishTime: string,
 *   },
 *   subscription: string,
 * }
 *
 * Verification: Pub/Sub adds a `?token=<GMAIL_WEBHOOK_SECRET>` query param
 * when configured via audience-based token verification, OR we compare the
 * Authorization bearer token. We use the simpler query-param approach:
 * set the push subscription endpoint to:
 *   https://<domain>/api/webhooks/gmail?token=<GMAIL_WEBHOOK_SECRET>
 */
export async function POST(req: NextRequest) {
  // --- 1. Verify shared secret ---
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.GMAIL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- 2. Parse Pub/Sub envelope ---
  let envelope: {
    message?: { data?: string; messageId?: string };
    subscription?: string;
  };
  try {
    envelope = (await req.json()) as typeof envelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawData = envelope.message?.data;
  if (!rawData) {
    // Pub/Sub requires a 200 response to acknowledge; return 204 for empty/malformed
    return new NextResponse(null, { status: 204 });
  }

  // --- 3. Decode Pub/Sub message ---
  let notification: { emailAddress?: string; historyId?: string };
  try {
    notification = JSON.parse(Buffer.from(rawData, "base64").toString("utf-8"));
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const { historyId } = notification;
  if (!historyId) return new NextResponse(null, { status: 204 });

  // --- 4. Fetch latest messages from Gmail history ---
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error("[gmail-webhook] token error:", err);
    // Return 500 so Pub/Sub retries
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 },
    );
  }

  const watchEmail = encodeURIComponent(process.env.GMAIL_WATCH_EMAIL!);

  // Get history since the last recorded historyId
  const { data: lastRecord } = await serviceClient
    .from("gmail_watch_state")
    .select("history_id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const startHistoryId = lastRecord?.history_id ?? historyId;

  let historyRes: Response;
  try {
    historyRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/${watchEmail}/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  } catch (err) {
    console.error("[gmail-webhook] history fetch error:", err);
    return NextResponse.json({ error: "Gmail API error" }, { status: 500 });
  }

  if (!historyRes.ok) {
    const body = await historyRes.text();
    console.error("[gmail-webhook] history error:", body);
    // 404 means historyId is too old — acknowledge and move on
    if (historyRes.status === 404)
      return new NextResponse(null, { status: 204 });
    return NextResponse.json({ error: "Gmail history error" }, { status: 500 });
  }

  const historyData = (await historyRes.json()) as {
    history?: {
      messagesAdded?: { message: { id: string; threadId: string } }[];
    }[];
    historyId?: string;
  };

  // Update stored historyId
  await serviceClient
    .from("gmail_watch_state")
    .upsert(
      {
        id: 1,
        history_id: historyData.historyId ?? historyId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  const addedMessages =
    historyData.history?.flatMap((h) => h.messagesAdded ?? []) ?? [];

  // --- 5. For each new message, fetch full details and upsert email_event ---
  for (const { message } of addedMessages) {
    try {
      const msg = await fetchMessage(message.id, accessToken);

      const from = getHeader(msg, "from");
      const subject = getHeader(msg, "subject");
      const receivedAt = msg.internalDate
        ? new Date(parseInt(msg.internalDate)).toISOString()
        : new Date().toISOString();

      const attachments = extractAttachments(msg);

      // Only store emails that have attachments (trade docs) or mention trade keywords
      const isTradeRelated =
        attachments.length > 0 ||
        /invoice|letter of credit|\bbol\b|bill of lading/i.test(subject);

      if (!isTradeRelated) continue;

      await serviceClient.from("email_events").upsert(
        {
          message_id: message.id,
          thread_id: message.threadId,
          from_address: from,
          subject: subject || null,
          snippet: msg.snippet || null,
          received_at: receivedAt,
          status: "NEW",
          attachment_meta: attachments,
        },
        { onConflict: "message_id", ignoreDuplicates: true },
      );
    } catch (err) {
      console.error(
        `[gmail-webhook] error processing message ${message.id}:`,
        err,
      );
      // Don't fail the whole batch for one bad message
    }
  }

  // Acknowledge to Pub/Sub
  return new NextResponse(null, { status: 204 });
}
