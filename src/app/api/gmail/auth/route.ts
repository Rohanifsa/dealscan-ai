import { NextResponse } from "next/server";

/**
 * GET /api/gmail/auth
 *
 * One-time route to kick off Gmail OAuth re-authorization with the correct
 * scopes. Visit this URL while logged in to generate a new refresh token.
 *
 * After completing the flow, update GOOGLE_REFRESH_TOKEN in .env.local
 * with the token printed by /api/gmail/auth/callback, then delete these
 * two route files and restart the dev server.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID not set" },
      { status: 500 },
    );
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/gmail/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent", // force re-consent so Google issues a new refresh token
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
