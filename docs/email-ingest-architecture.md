# Email-Triggered Trade Ingest — Architecture

## 1. Overview

When an email arrives at the watched Gmail inbox, the system:

1. Receives a push notification via Google Cloud Pub/Sub
2. Fetches the email content and attachments via Gmail API
3. Asks Gemini to classify whether the email represents a new trade
4. If yes, creates a `workflow` (trade) in Supabase and stores the email thread
5. Uploads any PDF attachments as `documents`
6. If all three required documents are present (LC + Invoice + Bill of Lading), fires the existing `trade/workflow.triggered` event to kick off extraction + compliance

---

## 2. High-Level Flow

```
Gmail inbox
    │
    │  (new email arrives)
    ▼
Google Cloud Pub/Sub
    │  topic: gmail-inbox-watch
    │  push subscription → HTTPS webhook
    ▼
/api/gmail/webhook  (Next.js route)
    │  validates token, decodes notification
    │  fires Inngest event: gmail/message.received { historyId }
    ▼
Inngest: processIncomingEmail
    │
    ├── Step: fetch-new-messages
    │     Gmail history.list(historyId) → list of new message IDs
    │
    └── For each message ID (parallel):
          │
          ├── Step: fetch-message-{id}
          │     Gmail messages.get(full) → headers + body + attachments
          │
          ├── Step: classify-email-{id}
          │     Gemini — is this a trade finance email?
          │     Output: { isTrade, tradeName, docTypesInAttachments }
          │     If isTrade = false → skip
          │
          ├── Step: find-or-create-trade-{id}
          │     Check email_events WHERE thread_id = X
          │     If exists → use existing workflow_id
          │     If not   → INSERT into workflows + email_events
          │
          ├── Step: upload-attachments-{id}
          │     For each PDF attachment:
          │       Classify filename via Gemini → doc_type (LC/INVOICE/BILL_OF_LADING)
          │       Upload to Supabase storage: trade-documents/
          │       INSERT into documents
          │
          └── Step: check-trigger-{id}
                Count distinct doc_type for this workflow_id
                If LC + INVOICE + BILL_OF_LADING all present:
                  step.sendEvent("trade/workflow.triggered", { workflowId })

    └── Step: store-history-id
          Save latest historyId to DB (gmail_state table)
```

---

## 3. Component Breakdown

### 3.1 Google Cloud Infra

| Component         | Details                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| Pub/Sub Topic     | `projects/{PROJECT_ID}/topics/gmail-inbox-watch`                                   |
| Push Subscription | Points to `https://{DOMAIN}/api/gmail/webhook`                                     |
| Gmail API         | Watches inbox via `gmail.users.watch()`                                            |
| Watch renewal     | Expires every 7 days → Inngest cron renews it daily                                |
| Publisher IAM     | `gmail-api-push@system.gserviceaccount.com` needs `Pub/Sub Publisher` on the topic |

### 3.2 Gmail OAuth2

The app authenticates to Gmail using **OAuth2 with a refresh token** (for a personal Gmail) or a **service account with domain-wide delegation** (for Google Workspace).

Credentials stored as env vars — never in code or DB.

### 3.3 Webhook Endpoint — `/api/gmail/webhook`

```
POST /api/gmail/webhook
Authorization: Bearer {PUBSUB_VERIFICATION_TOKEN}

Body (Pub/Sub push):
{
  message: {
    data: base64("{ emailAddress, historyId }"),
    messageId: "...",
    publishTime: "..."
  },
  subscription: "projects/.../subscriptions/..."
}
```

Handler:

1. Verify bearer token matches `PUBSUB_VERIFICATION_TOKEN`
2. Decode base64 data
3. Return `200 OK` immediately (Pub/Sub retries on non-2xx)
4. Fire Inngest event `gmail/message.received`

### 3.4 Inngest Functions (new)

| Function ID              | Trigger                  | Purpose                                           |
| ------------------------ | ------------------------ | ------------------------------------------------- |
| `process-incoming-email` | `gmail/message.received` | Main orchestrator                                 |
| `renew-gmail-watch`      | `scheduled` (daily cron) | Calls `gmail.users.watch()` to renew subscription |

### 3.5 Gemini Classification

**Email classifier call:**

```
Prompt:
  You are a trade finance email classifier.
  Given the email below, decide if it represents an incoming trade finance
  transaction that requires a new trade to be opened.

  From: {from}
  Subject: {subject}
  Body: {body (first 2000 chars)}

  Return JSON:
  {
    "is_trade_email": boolean,
    "confidence": "high" | "medium" | "low",
    "suggested_trade_name": string | null,
    "reasoning": string
  }
```

**Attachment classifier call (per PDF):**

```
Prompt:
  Filename: {filename}

  Classify this trade finance document. Return one of:
  LC | INVOICE | BILL_OF_LADING | UNKNOWN
  Return ONLY the label, nothing else.
```

For `UNKNOWN` attachments, store them as documents with a placeholder type and flag for human review.

---

## 4. Database Changes

### New table: `email_events`

Tracks every processed email, linking it to a workflow.

```sql
CREATE TABLE public.email_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id    uuid REFERENCES public.workflows(id) ON DELETE CASCADE,
  thread_id      text NOT NULL,          -- Gmail thread ID
  message_id     text NOT NULL UNIQUE,   -- Gmail message ID
  from_address   text NOT NULL,
  subject        text,
  received_at    timestamptz NOT NULL,
  snippet        text,                   -- Gmail snippet (preview)
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_email_events_thread_id ON public.email_events(thread_id);
CREATE INDEX idx_email_events_workflow_id ON public.email_events(workflow_id);
```

### New table: `gmail_state`

Stores the last-seen `historyId` to avoid re-processing old messages.

```sql
CREATE TABLE public.gmail_state (
  id          serial PRIMARY KEY,
  history_id  text NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

-- Seed one row on setup
INSERT INTO public.gmail_state (history_id) VALUES ('0');
```

### Changes to `workflows` table

```sql
ALTER TABLE public.workflows
  ADD COLUMN source text DEFAULT 'manual';
  -- 'manual' | 'email'
```

### New `workflow_step` enum values needed

```sql
ALTER TYPE workflow_step ADD VALUE 'EMAIL_RECEIVED';
ALTER TYPE workflow_step ADD VALUE 'EMAIL_CLASSIFIED';
ALTER TYPE workflow_step ADD VALUE 'DOCUMENTS_PENDING';   -- waiting for remaining docs
```

### New `doc_type` enum value (if needed for unknowns)

```sql
ALTER TYPE doc_type ADD VALUE 'UNKNOWN';
```

---

## 5. File Structure (new files)

```
src/
├── app/
│   └── api/
│       └── gmail/
│           └── webhook/
│               └── route.ts          # Pub/Sub push receiver
├── features/
│   └── email-ingest/
│       ├── inngest/
│       │   ├── processIncomingEmail.ts   # Main Inngest function
│       │   └── renewGmailWatch.ts        # Daily watch renewal
│       └── lib/
│           ├── gmailClient.ts            # OAuth2 Gmail API wrapper
│           ├── classifyEmail.ts          # Gemini email classifier
│           └── classifyAttachment.ts     # Gemini attachment type classifier
└── server/
    └── inngest/
        └── functions.ts                  # Register new functions here
```

---

## 6. Environment Variables Required

| Variable                      | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `GMAIL_CLIENT_ID`             | OAuth2 client ID from Google Cloud Console                                     |
| `GMAIL_CLIENT_SECRET`         | OAuth2 client secret                                                           |
| `GMAIL_REFRESH_TOKEN`         | Refresh token for the watched Gmail account                                    |
| `GMAIL_WATCHED_ADDRESS`       | The Gmail inbox to watch (e.g. `ops@yourbank.com`)                             |
| `GMAIL_PUBSUB_TOPIC`          | Full topic name (e.g. `projects/my-project/topics/gmail-inbox-watch`)          |
| `PUBSUB_VERIFICATION_TOKEN`   | Secret token to verify Pub/Sub push requests                                   |
| `GOOGLE_CLOUD_PROJECT_ID`     | Your GCP project ID                                                            |
| `EMAIL_INGEST_SYSTEM_USER_ID` | Supabase user UUID to use as `created_by` / `uploaded_by` for automated trades |

---

## 7. What I Need From You

To implement this, I need the following decisions / credentials / config:

### 7.1 Google Cloud (required before any code runs)

- [ ] **GCP Project ID** — which project to create the Pub/Sub topic in
- [ ] **Gmail address to watch** — which inbox receives trade finance emails
- [ ] **Auth method**:
  - _Option A_ — Personal Gmail: OAuth2 refresh token (I'll give you the OAuth consent screen steps)
  - _Option B_ — Google Workspace: Service account JSON with domain-wide delegation
- [ ] **Deployed webhook URL** — Pub/Sub requires HTTPS. Either your Vercel domain (`https://techguardai.vercel.app/api/gmail/webhook`) or a tunnel like `ngrok` for local dev

### 7.2 Supabase

- [ ] Confirm it's OK to add the `email_events` and `gmail_state` tables (I'll write the migration)
- [ ] **System user ID** — a Supabase `auth.users` UUID to use as the automated actor. Either create a dedicated service user, or tell me which existing user to use.

### 7.3 Product decisions

- [ ] **Attachment classification fallback** — if Gemini can't identify a PDF as LC/Invoice/BL from the filename alone, should we:
  - (a) send the PDF to Gemini for full classification, or
  - (b) mark it `UNKNOWN` and let a human assign it in the UI?
- [ ] **Duplicate trade guard** — if the same email thread sends a 4th email later (e.g. a correction), should we:
  - (a) just append new attachments to the existing trade, or
  - (b) create a new trade?
- [ ] **Non-trade emails** — if Gemini classifies confidence as `low`, should we:
  - (a) silently discard, or
  - (b) log it somewhere for human review?

---

## 8. Implementation Order

Once the above is confirmed, implementation goes in this order:

1. **DB migration** — `email_events`, `gmail_state`, alter `workflows`
2. **Gmail client lib** — OAuth2 token refresh + API wrapper
3. **Webhook route** — `/api/gmail/webhook` with token verification
4. **Inngest: `renewGmailWatch`** — daily cron, one-time setup call
5. **Inngest: `processIncomingEmail`** — all steps in order
6. **Register new Inngest functions** in `functions.ts`
7. **One-time setup script** — call `gmail.users.watch()` to bootstrap the subscription
8. **Local dev** — `ngrok` tunnel + Inngest dev server for end-to-end test

---

## 9. Security Considerations

- Pub/Sub push endpoint is protected by a bearer token (`PUBSUB_VERIFICATION_TOKEN`). Any request without it gets `401`.
- Gmail refresh token is stored only in env vars, never in DB or logs.
- Attachment bytes are streamed from Gmail → directly to Supabase storage; never written to disk.
- Email body/subject is truncated before sending to Gemini (first 2000 chars) to avoid leaking long sensitive content.
- `email_events.snippet` stores only the Gmail-generated preview snippet (a few words), not the full body.
- RLS policies on `email_events` should mirror those on `workflows` — users only see their own trades.
