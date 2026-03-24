import type { Bookmark } from "@/lib/types";

export function normalizeBookmarkUrl(rawUrl: string) {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    throw new Error("Enter a valid URL.");
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(withProtocol);
  } catch {
    throw new Error("Enter a valid URL.");
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname ||
    /\s/.test(parsedUrl.hostname)
  ) {
    throw new Error("Enter a valid URL.");
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isLocalhost = hostname === "localhost";
  const isIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  const isIpv6 = hostname.includes(":");
  const looksLikeDomain = isValidDomainHostname(hostname);

  if (!isLocalhost && !isIpv4 && !isIpv6 && !looksLikeDomain) {
    throw new Error("Enter a valid URL.");
  }

  return parsedUrl.toString();
}

export function parseBookmarkTags(rawTags: string) {
  return rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag, index, tags) => tag.length > 0 && tags.indexOf(tag) === index);
}

export function filterBookmarks(
  bookmarks: Bookmark[],
  query: string,
  activeTag: string | null,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return bookmarks.filter((bookmark) => {
    const matchesQuery =
      !normalizedQuery ||
      bookmark.title.toLowerCase().includes(normalizedQuery) ||
      bookmark.url.toLowerCase().includes(normalizedQuery);
    const matchesTag = !activeTag || bookmark.tags.includes(activeTag);

    return matchesQuery && matchesTag;
  });
}

export function upsertBookmarkInList(bookmarks: Bookmark[], bookmark: Bookmark) {
  return [bookmark, ...bookmarks.filter((entry) => entry.id !== bookmark.id)];
}

export function removeBookmarkFromList(bookmarks: Bookmark[], bookmarkId: string) {
  return bookmarks.filter((bookmark) => bookmark.id !== bookmarkId);
}

function isValidDomainHostname(hostname: string) {
  const reservedTopLevelLabels = new Set([
    "example",
    "invalid",
    "local",
    "localhost",
    "test",
  ]);
  const labels = hostname.split(".");

  if (labels.length < 2) {
    return false;
  }

  const validLabels = labels.every((label) =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
  );

  if (!validLabels) {
    return false;
  }

  const topLevelLabel = labels.at(-1);

  if (!topLevelLabel) {
    return false;
  }

  return (
    /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(topLevelLabel) &&
    !reservedTopLevelLabels.has(topLevelLabel.toLowerCase())
  );
}
