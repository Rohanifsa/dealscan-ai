import { inngest } from "@/server/inngest/client";
import { getAccessToken, watchInbox } from "@/lib/gmail";
import { serviceClient } from "@/lib/supabase/service";

/**
 * Renews the Gmail push watch every 6 days.
 * Gmail watch subscriptions expire after 7 days — we renew early to avoid gaps.
 */
export const renewGmailWatch = inngest.createFunction(
  {
    id: "renew-gmail-watch",
    name: "Renew Gmail Push Watch",
    triggers: [{ cron: "0 9 */6 * *" }], // every 6 days at 09:00 UTC
  },
  async () => {
    const accessToken = await getAccessToken();
    const result = await watchInbox(accessToken);

    // Persist the new historyId so the webhook handler has a baseline
    await serviceClient.from("gmail_watch_state").upsert(
      {
        id: 1,
        history_id: result.historyId,
        expiration: new Date(parseInt(result.expiration)).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    console.log(
      `[renew-gmail-watch] Watch renewed. historyId=${result.historyId} expires=${result.expiration}`,
    );

    return { historyId: result.historyId, expiration: result.expiration };
  },
);
