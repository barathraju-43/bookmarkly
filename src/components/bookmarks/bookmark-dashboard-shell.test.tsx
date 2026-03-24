// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookmarkDashboardShell } from "@/components/bookmarks/bookmark-dashboard-shell";
import type { Bookmark } from "@/lib/types";

const bookmarkDashboardSpy = vi.fn();
const createClientMock = vi.fn();

vi.mock("@/components/bookmarks/bookmark-dashboard", () => ({
  BookmarkDashboard: (props: unknown) => {
    bookmarkDashboardSpy(props);
    return null;
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => createClientMock(),
}));

describe("BookmarkDashboardShell", () => {
  beforeEach(() => {
    bookmarkDashboardSpy.mockClear();
    createClientMock.mockReset();
  });

  it("authenticates realtime before subscribing to bookmark changes", async () => {
    let resolveSession:
      | ((value: {
          data: {
            session: {
              access_token: string;
            };
          };
        }) => void)
      | null = null;

    const getSession = vi.fn(
      () =>
        new Promise<{
          data: { session: { access_token: string } };
        }>((resolve) => {
          resolveSession = resolve;
        }),
    );
    const setAuth = vi.fn(async () => undefined);
    const onAuthStateChange = vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
    const subscribe = vi.fn();
    const on = vi.fn(function () {
      return channel;
    });
    const channel = {
      on,
      subscribe,
    };
    const removeChannel = vi.fn(async () => undefined);

    createClientMock.mockReturnValue({
      auth: {
        getSession,
        onAuthStateChange,
      },
      realtime: {
        setAuth,
      },
      channel: vi.fn(() => channel),
      removeChannel,
    });

    render(
      <BookmarkDashboardShell
        initialBookmarks={[]}
        user={{
          id: "user-1",
          email: "candidate@example.com",
          fullName: "Candidate",
          avatarUrl: null,
        }}
      />,
    );

    const dashboardProps = bookmarkDashboardSpy.mock.calls.at(-1)?.[0] as {
      subscribe: (handlers: {
        onInsert: (bookmark: Bookmark) => void;
        onUpdate: (bookmark: Bookmark) => void;
        onDelete: (bookmarkId: string) => void;
      }) => () => void;
    };

    dashboardProps.subscribe({
      onInsert: vi.fn(),
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(subscribe).not.toHaveBeenCalled();

    resolveSession?.({
      data: {
        session: {
          access_token: "token-123",
        },
      },
    });

    await waitFor(() => {
      expect(setAuth).toHaveBeenCalledWith("token-123");
      expect(subscribe).toHaveBeenCalledTimes(1);
    });

    expect(setAuth.mock.invocationCallOrder[0]).toBeLessThan(
      subscribe.mock.invocationCallOrder[0],
    );
  });
});
