import { redirect } from "next/navigation";

import { BookmarkDashboardShell } from "@/components/bookmarks/bookmark-dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import type { Bookmark } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=signin-required");
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const fullName =
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email ??
    "Reader";
  const avatarUrl =
    user.user_metadata.avatar_url ?? user.user_metadata.picture ?? null;

  return (
    <main className="min-h-screen bg-transparent">
      <BookmarkDashboardShell
        initialBookmarks={(data ?? []) as Bookmark[]}
        user={{
          id: user.id,
          email: user.email ?? null,
          fullName,
          avatarUrl,
        }}
      />
    </main>
  );
}
