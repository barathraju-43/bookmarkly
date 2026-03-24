"use client";

import { useCallback, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import {
  createBookmarkAction,
  deleteBookmarkAction,
  updateBookmarkAction,
} from "@/app/app/actions";
import {
  BookmarkDashboard,
  type DashboardUser,
} from "@/components/bookmarks/bookmark-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { Bookmark } from "@/lib/types";

type BookmarkDashboardShellProps = {
  initialBookmarks: Bookmark[];
  user: DashboardUser;
};

export function BookmarkDashboardShell({
  initialBookmarks,
  user,
}: BookmarkDashboardShellProps) {
  const [supabase] = useState(() => createClient());

  const subscribe = useCallback(
    ({
      onInsert,
      onUpdate,
      onDelete,
    }: {
      onInsert: (bookmark: Bookmark) => void;
      onUpdate: (bookmark: Bookmark) => void;
      onDelete: (bookmarkId: string) => void;
    }) => {
      let channel:
        | ReturnType<typeof supabase.channel>
        | null = null;
      let cancelled = false;

      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.access_token) {
          void supabase.realtime.setAuth(session.access_token);
        }
      });

      const startSubscription = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) {
          return;
        }

        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }

        if (cancelled) {
          return;
        }

        channel = supabase
          .channel(`bookmarks:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "bookmarks",
              filter: `user_id=eq.${user.id}`,
            },
            (payload: RealtimePostgresChangesPayload<Bookmark>) => {
              onInsert(payload.new as Bookmark);
            },
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "bookmarks",
              filter: `user_id=eq.${user.id}`,
            },
            (payload: RealtimePostgresChangesPayload<Bookmark>) => {
              onUpdate(payload.new as Bookmark);
            },
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "bookmarks",
            },
            (payload: RealtimePostgresChangesPayload<Bookmark>) => {
              const oldBookmark = payload.old as Partial<Bookmark>;
              const bookmarkId =
                typeof oldBookmark.id === "string" ? oldBookmark.id : null;

              if (bookmarkId) {
                onDelete(bookmarkId);
              }
            },
          )
          .subscribe();
      };

      void startSubscription();

      return () => {
        cancelled = true;
        authSubscription.unsubscribe();

        if (channel) {
          void supabase.removeChannel(channel);
        }
      };
    },
    [supabase, user.id],
  );

  return (
    <BookmarkDashboard
      initialBookmarks={initialBookmarks}
      user={user}
      onCreateBookmark={createBookmarkAction}
      onUpdateBookmark={updateBookmarkAction}
      onDeleteBookmark={deleteBookmarkAction}
      subscribe={subscribe}
    />
  );
}
