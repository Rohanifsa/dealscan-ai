import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/gmail/auth/callback
 *
 * OAuth callback — exchanges the authorization code for tokens and displays
 * the refresh token. Copy it into GOOGLE_REFRESH_TOKEN in .env.local.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(`<h1>OAuth error</h1><pre>${error}</pre>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code) {
    return new NextResponse(`<h1>Missing code</h1>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/gmail/auth/callback`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || json.error) {
    return new NextResponse(
      `<h1>Token exchange failed</h1><pre>${JSON.stringify(json, null, 2)}</pre>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }

  const html = `<!DOCTYPE html>
<html>
<head><title>Gmail Auth Success</title></head>
<body style="font-family:monospace;padding:2rem;max-width:800px">
  <h1 style="color:green">✅ Authorization successful!</h1>
  <p>Copy the refresh token below into your <code>.env.local</code>:</p>
  <pre style="background:#f4f4f4;padding:1rem;border-radius:6px;word-break:break-all">
GOOGLE_REFRESH_TOKEN=${json.refresh_token ?? "(no refresh token — make sure prompt=consent was set)"}
  </pre>
  <p style="color:#888">After updating .env.local, restart the dev server and delete<br>
  <code>src/app/api/gmail/auth/</code> (these routes are no longer needed).</p>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
