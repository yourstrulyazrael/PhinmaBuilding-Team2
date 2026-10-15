import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page request (Next.js 16 calls this "proxy"; older
 * versions called it "middleware"). It does two jobs:
 *
 * 1. Keeps the technician signed in by refreshing their login cookie.
 * 2. Sends signed-out visitors to /login, except on public pages.
 *
 * This is only a convenience redirect. The real protection is Row Level
 * Security in the database: even without this file, a signed-out visitor
 * could not read anyone's data.
 */

// Pages anyone may open without signing in.
const PUBLIC_PATHS = ["/login", "/track"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // getClaims() checks the login is genuine (its signature) and refreshes
  // the cookie if it is about to expire. With Supabase's newer signing
  // keys it checks right here, without a round trip to Supabase, which
  // makes every click faster; with older keys it asks Supabase, as
  // getUser() did. Pages still confirm the user with getUser().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    return redirectTo("/login", request, response);
  }
  // No "signed in, so leave /login" redirect here. getClaims() only
  // checks the cookie's signature, so a login that has ended on
  // Supabase's side (signed out elsewhere, account removed) still looks
  // valid here while getUser() in the pages says "signed out". The page
  // sends you to /login, this would send you back to /, and the browser
  // loops forever (ERR_TOO_MANY_REDIRECTS). Signing in already lands on /.

  return response;
}

// A redirect that keeps any refreshed login cookie.
function redirectTo(path: string, request: NextRequest, from: NextResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Skip Next.js internals and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
