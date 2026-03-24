import { describe, expect, it } from "vitest";

import {
  filterBookmarks,
  normalizeBookmarkUrl,
  parseBookmarkTags,
  removeBookmarkFromList,
  upsertBookmarkInList,
} from "@/lib/bookmarks";
import type { Bookmark } from "@/lib/types";

const baseBookmarks: Bookmark[] = [
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

describe("normalizeBookmarkUrl", () => {
  it("returns a normalized https URL for a bare domain", () => {
    expect(normalizeBookmarkUrl("example.com/resource")).toBe(
      "https://example.com/resource",
    );
  });

  it("keeps a valid https URL intact", () => {
    expect(normalizeBookmarkUrl("https://openai.com/api")).toBe(
      "https://openai.com/api",
    );
  });

  it("throws for malformed URLs", () => {
    expect(() => normalizeBookmarkUrl("not a valid url")).toThrow(
      "Enter a valid URL.",
    );
  });

  it("throws for bare words without a real host", () => {
    expect(() => normalizeBookmarkUrl("bookmark")).toThrow(
      "Enter a valid URL.",
    );
  });

  it("throws for hostnames without a valid public suffix", () => {
    expect(() => normalizeBookmarkUrl("github.local")).toThrow(
      "Enter a valid URL.",
    );
  });
});

describe("parseBookmarkTags", () => {
  it("trims, deduplicates, and removes empty entries", () => {
    expect(
      parseBookmarkTags(" backend, docs ,backend, , realtime , docs "),
    ).toEqual(["backend", "docs", "realtime"]);
  });
});

describe("filterBookmarks", () => {
  it("filters by title or url text", () => {
    expect(filterBookmarks(baseBookmarks, "vercel", null)).toEqual([
      baseBookmarks[1],
    ]);
  });

  it("filters by active tag", () => {
    expect(filterBookmarks(baseBookmarks, "", "backend")).toEqual([
      baseBookmarks[0],
    ]);
  });
});

describe("upsertBookmarkInList", () => {
  it("prepends a new bookmark and deduplicates by id", () => {
    const inserted = upsertBookmarkInList(baseBookmarks, {
      id: "2",
      user_id: "user-1",
      url: "https://vercel.com/docs",
      title: "Updated Vercel Docs",
      tags: ["deploy", "docs"],
      created_at: "2026-03-24T12:00:00.000Z",
      updated_at: "2026-03-24T12:00:00.000Z",
    });

    expect(inserted).toHaveLength(2);
    expect(inserted[0]?.title).toBe("Updated Vercel Docs");
    expect(inserted[0]?.id).toBe("2");
  });
});

describe("removeBookmarkFromList", () => {
  it("removes a bookmark by id", () => {
    expect(removeBookmarkFromList(baseBookmarks, "1")).toEqual([
      baseBookmarks[1],
    ]);
  });
});
