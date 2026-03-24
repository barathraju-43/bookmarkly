// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookmarkDashboard } from "@/components/bookmarks/bookmark-dashboard";
import type { Bookmark, BookmarkFormInput } from "@/lib/types";

const bookmarks: Bookmark[] = [
  {
    id: "1",
    user_id: "user-1",
    url: "https://supabase.com/docs",
    title: "Supabase Docs",
    tags: ["backend", "docs"],
    created_at: "2026-03-24T10:00:00.000Z",
    updated_at: "2026-03-24T10:00:00.000Z",
  },
  {
    id: "2",
    user_id: "user-1",
    url: "https://vercel.com/guides",
    title: "Vercel Guides",
    tags: ["deploy"],
    created_at: "2026-03-24T11:00:00.000Z",
    updated_at: "2026-03-24T11:00:00.000Z",
  },
];

function renderDashboard(overrides?: {
  initialBookmarks?: Bookmark[];
  onCreateBookmark?: (input: BookmarkFormInput) => Promise<Bookmark>;
  onUpdateBookmark?: (bookmarkId: string, input: BookmarkFormInput) => Promise<Bookmark>;
  onDeleteBookmark?: (bookmarkId: string) => Promise<void>;
  subscribe?: (handlers: {
    onInsert: (bookmark: Bookmark) => void;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (bookmarkId: string) => void;
  }) => () => void;
}) {
  const onCreateBookmark =
    overrides?.onCreateBookmark ??
    vi.fn(async (input: BookmarkFormInput) => ({
      id: "3",
      user_id: "user-1",
      url: "https://openai.com/api",
      title: input.title,
      tags: ["ai"],
      created_at: "2026-03-24T12:00:00.000Z",
      updated_at: "2026-03-24T12:00:00.000Z",
    }));
  const onDeleteBookmark =
    overrides?.onDeleteBookmark ?? vi.fn(async () => undefined);
  const onUpdateBookmark =
    overrides?.onUpdateBookmark ??
    vi.fn(async (bookmarkId: string, input: BookmarkFormInput) => ({
      id: bookmarkId,
      user_id: "user-1",
      url: input.url.startsWith("http") ? input.url : `https://${input.url}`,
      title: input.title,
      tags: input.tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean),
      created_at: "2026-03-24T10:00:00.000Z",
      updated_at: "2026-03-24T13:00:00.000Z",
    }));
  const subscribe =
    overrides?.subscribe ?? vi.fn(() => () => undefined);

  const result = render(
    <BookmarkDashboard
      initialBookmarks={overrides?.initialBookmarks ?? bookmarks}
      user={{
        id: "user-1",
        email: "candidate@example.com",
        fullName: "Candidate",
        avatarUrl: null,
      }}
      onCreateBookmark={onCreateBookmark}
      onUpdateBookmark={onUpdateBookmark}
      onDeleteBookmark={onDeleteBookmark}
      subscribe={subscribe}
    />,
  );

  return {
    ...result,
    onCreateBookmark,
    onUpdateBookmark,
    onDeleteBookmark,
    subscribe,
  };
}

describe("BookmarkDashboard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the Stitch-inspired dashboard shell", () => {
    renderDashboard();

    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText("Personal Library")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Bookmark" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Tags/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Layout" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "List" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign Out" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Supabase Docs" }),
    ).toHaveAttribute("href", "https://supabase.com/docs");
  });

  it("renders the empty state when there are no bookmarks", () => {
    renderDashboard({ initialBookmarks: [] });

    expect(
      screen.getByText("Your bookmarks stay private to your account."),
    ).toBeInTheDocument();
  });

  it("shows validation errors for missing fields", async () => {
    const user = userEvent.setup();

    renderDashboard({ initialBookmarks: [] });

    await user.click(screen.getByRole("button", { name: "Add Bookmark" }));
    await user.click(screen.getByRole("button", { name: "Add Bookmark Submit" }));

    expect(screen.getByText("URL is required.")).toBeInTheDocument();
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
  });

  it("rejects invalid URLs before creating a bookmark", async () => {
    const user = userEvent.setup();
    const { onCreateBookmark } = renderDashboard({ initialBookmarks: [] });

    await user.click(screen.getByRole("button", { name: "Add Bookmark" }));
    await user.type(screen.getByLabelText("URL"), "bookmark");
    await user.type(screen.getByLabelText("Title"), "Invalid Bookmark");
    await user.click(screen.getByRole("button", { name: "Add Bookmark Submit" }));

    expect(screen.getByText("Enter a valid URL.")).toBeInTheDocument();
    expect(onCreateBookmark).not.toHaveBeenCalled();
  });

  it("creates a bookmark, clears the form, and adds it to the list", async () => {
    const user = userEvent.setup();
    const { onCreateBookmark } = renderDashboard({ initialBookmarks: [] });

    await user.click(screen.getByRole("button", { name: "Add Bookmark" }));
    await user.type(
      screen.getByLabelText("URL"),
      "openai.com/blog",
    );
    await user.type(screen.getByLabelText("Title"), "OpenAI Blog");
    await user.type(screen.getByLabelText("Tags"), "ai, research");
    await user.click(screen.getByRole("button", { name: "Add Bookmark Submit" }));

    await waitFor(() => {
      expect(onCreateBookmark).toHaveBeenCalledWith({
        url: "openai.com/blog",
        title: "OpenAI Blog",
        tagsInput: "ai, research",
      });
    });

    expect(screen.getByText("OpenAI Blog")).toBeInTheDocument();
    expect(screen.queryByText("Destination URL")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Bookmark" }));
    expect(screen.getByLabelText("URL")).toHaveValue("");
    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Tags")).toHaveValue("");
  });

  it("filters bookmarks by search text and active tag", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.type(screen.getByLabelText("Search bookmarks"), "vercel");
    expect(screen.getByText("Vercel Guides")).toBeInTheDocument();
    expect(screen.queryByText("Supabase Docs")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search bookmarks"));
    await user.click(screen.getByRole("button", { name: "backend" }));

    expect(screen.getByText("Supabase Docs")).toBeInTheDocument();
    expect(screen.queryByText("Vercel Guides")).not.toBeInTheDocument();
  });

  it("switches layout modes from the layout menu", async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(screen.getByRole("button", { name: "Layout" })).toHaveAttribute(
      "data-layout-mode",
      "list",
    );

    await user.click(screen.getByRole("button", { name: "Layout" }));
    await user.click(screen.getByRole("menuitem", { name: "Icons" }));
    expect(screen.getByRole("button", { name: "Layout" })).toHaveAttribute(
      "data-layout-mode",
      "icons",
    );

    await user.click(screen.getByRole("button", { name: "Layout" }));
    await user.click(screen.getByRole("menuitem", { name: "List" }));
    expect(screen.getByRole("button", { name: "Layout" })).toHaveAttribute(
      "data-layout-mode",
      "list",
    );
  });

  it("keeps long URLs truncated while exposing the full value", () => {
    const longUrl =
      "https://example.com/articles/very/long/path/with/many/segments/and/a-query-string?utm_source=bookmarkly&utm_medium=test";

    renderDashboard({
      initialBookmarks: [
        {
          ...bookmarks[0],
          id: "long-url",
          url: longUrl,
          title: "Long URL Bookmark",
        },
      ],
    });

    expect(screen.getByTitle(longUrl)).toBeInTheDocument();
  });

  it("reveals sign out from the profile menu", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: "Open profile menu" }));

    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("asks for confirmation before deleting a bookmark", async () => {
    const user = userEvent.setup();
    const { onDeleteBookmark } = renderDashboard();

    await user.click(screen.getByRole("button", { name: "Delete Vercel Guides" }));
    expect(
      screen.getByText("Delete Bookmark?")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(onDeleteBookmark).toHaveBeenCalledWith("2");
    });
    expect(screen.queryByText("Vercel Guides")).not.toBeInTheDocument();
  });

  it("edits an existing bookmark", async () => {
    const user = userEvent.setup();
    const { onUpdateBookmark } = renderDashboard();

    await user.click(screen.getByRole("button", { name: "Edit Supabase Docs" }));
    expect(screen.getByText("Edit Bookmark")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Supabase Platform Docs");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onUpdateBookmark).toHaveBeenCalledWith("1", {
        url: "https://supabase.com/docs",
        title: "Supabase Platform Docs",
        tagsInput: "backend, docs",
      });
    });

    expect(screen.getByText("Supabase Platform Docs")).toBeInTheDocument();
  });

  it("shows deleted bookmarks inside recently deleted", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: "Delete Vercel Guides" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("Vercel Guides")).not.toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /^Recently deleted/ }),
    );
    expect(
      screen.getByRole("heading", { name: "Recently deleted" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vercel Guides")).toBeInTheDocument();
  });

  it("restores a bookmark from recently deleted", async () => {
    const user = userEvent.setup();
    const { onCreateBookmark } = renderDashboard();

    await user.click(screen.getByRole("button", { name: "Delete Vercel Guides" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("Vercel Guides")).not.toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /^Recently deleted/ }),
    );
    await user.click(screen.getByRole("button", { name: "Restore Vercel Guides" }));

    await waitFor(() => {
      expect(onCreateBookmark).toHaveBeenCalledWith({
        url: "https://vercel.com/guides",
        title: "Vercel Guides",
        tagsInput: "deploy",
      });
    });

    expect(screen.getByText("Vercel Guides")).toBeInTheDocument();
  });

  it("applies realtime inserts and cleans up the subscription on unmount", async () => {
    const cleanup = vi.fn();
    let handlers:
      | {
          onInsert: (bookmark: Bookmark) => void;
          onUpdate: (bookmark: Bookmark) => void;
          onDelete: (bookmarkId: string) => void;
        }
      | undefined;

    const subscribe = vi.fn((nextHandlers) => {
      handlers = nextHandlers;
      return cleanup;
    });

    const view = renderDashboard({ subscribe });

    expect(subscribe).toHaveBeenCalledTimes(1);

    handlers?.onInsert({
      id: "3",
      user_id: "user-1",
      url: "https://github.com",
      title: "GitHub",
      tags: ["tools"],
      created_at: "2026-03-24T12:00:00.000Z",
      updated_at: "2026-03-24T12:00:00.000Z",
    });

    expect(
      await screen.findByRole("link", { name: "GitHub" }),
    ).toBeInTheDocument();

    view.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
