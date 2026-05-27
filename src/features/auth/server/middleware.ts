import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/sign-in", "/sign-up"];
const PROTECTED_PREFIXES = ["/dashboard", "/workflow"];

// Exact Supabase SSR boilerplate — do NOT add code between createServerClient
// and getClaims(), and always return supabaseResponse as-is or copy its cookies.
export async function authProxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.next({ request });
  }

  const supabaseResponse = NextResponse.next({ request });

  console.log("[proxy] path:", request.nextUrl.pathname);
  console.log(
    "[proxy] SUPABASE_URL defined:",
    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  console.log(
    "[proxy] ANON_KEY defined:",
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  console.log(
    "[proxy] incoming cookies:",
    request.cookies.getAll().map((c) => c.name),
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write to both request (for same-cycle reads) and response (for browser)
          // Do NOT recreate supabaseResponse here — that drops previously set headers
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
          console.log(
            "[proxy] setAll called with:",
            cookiesToSet.map((c) => c.name),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  console.log("[proxy] user after getClaims:", user ? user.sub : "none");

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isProtectedPath = PROTECTED_PREFIXES.some((p) =>
    pathname.startsWith(p),
  );

  if (!user && (isProtectedPath || (!isPublicPath && pathname !== "/"))) {
    console.log("[proxy] no user on protected path, redirecting to /sign-in");
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    console.log(
      "[proxy] authenticated user on public path, redirecting to /dashboard",
    );
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
