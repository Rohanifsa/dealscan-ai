import type { NextRequest } from "next/server";
import { authProxy } from "@/features/auth/server/middleware";

export function proxy(request: NextRequest) {
  return authProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
