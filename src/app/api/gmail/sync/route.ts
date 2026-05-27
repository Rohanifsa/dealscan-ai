import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  getAccessToken,
  listMessages,
  fetchMessage,
  extractAttachments,
  getHeader,
} from "@/lib/gmail";

/**
 * POST /api/gmail/sync
 *
 * Manually fetches the latest 25 inbox messages from Gmail and upserts
 * any new ones into email_events. Used for local dev (bypasses Pub/Sub
 * which requires a public HTTPS endpoint).
 *
 * Protected by the user's session — must be logged in.
 */
export async function POST() {
  // Verify the caller is authenticated
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let messageList: { id: string; threadId: string }[];
  try {
    messageList = await listMessages(accessToken, 25);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let inserted = 0;
  let skipped = 0;

  for (const { id, threadId } of messageList) {
    try {
      const msg = await fetchMessage(id, accessToken);

      const from = getHeader(msg, "from");
      const subject = getHeader(msg, "subject");
      const receivedAt = msg.internalDate
        ? new Date(parseInt(msg.internalDate)).toISOString()
        : new Date().toISOString();

      const attachments = extractAttachments(msg);

      const { error } = await supabase.from("email_events").upsert(
        {
          message_id: id,
          thread_id: threadId,
          from_address: from,
          subject: subject || null,
          snippet: msg.snippet || null,
          received_at: receivedAt,
          status: "NEW",
          attachment_meta: attachments,
          created_by: user.id,
        },
        { onConflict: "message_id", ignoreDuplicates: true },
      );

      if (error) {
        console.error(`[gmail-sync] upsert error for ${id}:`, error.message);
        skipped++;
      } else {
        inserted++;
      }
    } catch (err) {
      console.error(`[gmail-sync] error processing ${id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    fetched: messageList.length,
    inserted,
    skipped,
  });
}
