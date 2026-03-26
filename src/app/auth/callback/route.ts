import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next");
  const redirectPath =
    nextPath && nextPath.startsWith("/") ? nextPath : "/app";

  if (!code) {
    return NextResponse.redirect(
      new URL("/?auth=oauth-error", requestUrl.origin),
    );
  }

  const env = getSupabaseEnv();

  if (!env) {
    return NextResponse.redirect(
      new URL("/?auth=oauth-error", requestUrl.origin),
    );
  }

  const redirectResponse = NextResponse.redirect(
    new URL(redirectPath, requestUrl.origin),
  );

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/?auth=oauth-error", requestUrl.origin),
    );
  }

  return redirectResponse;
}
