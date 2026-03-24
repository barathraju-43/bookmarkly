"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  Bookmark as BookmarkIcon,
  ChevronDown,
  ExternalLink,
  Filter,
  Library,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  filterBookmarks,
  normalizeBookmarkUrl,
  removeBookmarkFromList,
  upsertBookmarkInList,
} from "@/lib/bookmarks";
import type { Bookmark, BookmarkFormInput } from "@/lib/types";
import { cn } from "@/lib/utils";

type DashboardUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

type BookmarkDashboardProps = {
  initialBookmarks: Bookmark[];
  user: DashboardUser;
  onCreateBookmark: (input: BookmarkFormInput) => Promise<Bookmark>;
  onUpdateBookmark: (
    bookmarkId: string,
    input: BookmarkFormInput,
  ) => Promise<Bookmark>;
  onDeleteBookmark: (bookmarkId: string) => Promise<void>;
  subscribe: (handlers: {
    onInsert: (bookmark: Bookmark) => void;
    onUpdate: (bookmark: Bookmark) => void;
    onDelete: (bookmarkId: string) => void;
  }) => () => void;
};

type FormErrors = {
  url?: string;
  title?: string;
};

type LayoutMode = "list" | "icons";
type SidebarView = "library" | "recentlyDeleted";

type DeletedBookmark = {
  bookmark: Bookmark;
  deletedAt: string;
};

const RECENTLY_DELETED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function BookmarkDashboard({
  initialBookmarks,
  user,
  onCreateBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
  subscribe,
}: BookmarkDashboardProps) {
  const storageKey = `bookmarkly:recently-deleted:${user.id}`;
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [recentlyDeleted, setRecentlyDeleted] = useState<DeletedBookmark[]>([]);
  const [hasLoadedDeletedBookmarks, setHasLoadedDeletedBookmarks] =
    useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>("library");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("list");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Bookmark | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoringBookmarkId, setRestoringBookmarkId] = useState<string | null>(
    null,
  );
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showTagFilters, setShowTagFilters] = useState(true);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const layoutMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecentlyDeleted(readDeletedBookmarks(storageKey));
    setHasLoadedDeletedBookmarks(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedDeletedBookmarks) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(sanitizeDeletedBookmarks(recentlyDeleted)),
    );
  }, [hasLoadedDeletedBookmarks, recentlyDeleted, storageKey]);

  useEffect(() => {
    return subscribe({
      onInsert: (bookmark) => {
        setBookmarks((currentBookmarks) =>
          upsertBookmarkInList(currentBookmarks, bookmark),
        );
        setRecentlyDeleted((currentDeleted) =>
          currentDeleted.filter((entry) => entry.bookmark.id !== bookmark.id),
        );
      },
      onUpdate: (bookmark) => {
        setBookmarks((currentBookmarks) =>
          upsertBookmarkInList(currentBookmarks, bookmark),
        );
      },
      onDelete: (bookmarkId) => {
        let removedBookmark: Bookmark | undefined;

        setBookmarks((currentBookmarks) => {
          removedBookmark = currentBookmarks.find(
            (bookmark) => bookmark.id === bookmarkId,
          );

          return removeBookmarkFromList(currentBookmarks, bookmarkId);
        });

        if (removedBookmark) {
          rememberDeletedBookmark(removedBookmark, setRecentlyDeleted);
        }
      },
    });
  }, [subscribe]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        layoutMenuRef.current &&
        !layoutMenuRef.current.contains(target)
      ) {
        setIsLayoutMenuOpen(false);
      }

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLayoutMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const visibleBookmarks = filterBookmarks(
    bookmarks,
    deferredSearchQuery,
    activeTag,
  );
  const allTags = Array.from(
    new Set(bookmarks.flatMap((bookmark) => bookmark.tags)),
  ).sort((left, right) => left.localeCompare(right));
  const filteredDeletedBookmarks = filterDeletedBookmarks(
    recentlyDeleted,
    deferredSearchQuery,
  );
  const initials = (user.fullName ?? user.email ?? "BK")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const modalTitle = editingBookmark ? "Edit Bookmark" : "Add Bookmark";
  const modalDescription = editingBookmark
    ? "Refine the destination, title, or tags without losing your place in the library."
    : "Save a new URL, label it clearly, and optionally attach tags.";

  function resetForm(bookmark?: Bookmark) {
    setUrl(bookmark?.url ?? "");
    setTitle(bookmark?.title ?? "");
    setTagsInput(bookmark ? bookmark.tags.join(", ") : "");
    setErrors({});
  }

  function openCreateModal() {
    setEditingBookmark(null);
    resetForm();
    setIsAddModalOpen(true);
  }

  function openEditModal(bookmark: Bookmark) {
    setEditingBookmark(bookmark);
    resetForm(bookmark);
    setIsAddModalOpen(true);
  }

  function closeModal() {
    setIsAddModalOpen(false);
    setEditingBookmark(null);
    resetForm();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};

    if (!url.trim()) {
      nextErrors.url = "URL is required.";
    } else {
      try {
        normalizeBookmarkUrl(url);
      } catch (error) {
        nextErrors.url =
          error instanceof Error ? error.message : "Enter a valid URL.";
      }
    }

    if (!title.trim()) {
      nextErrors.title = "Title is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const input: BookmarkFormInput = { url, title, tagsInput };
    setIsSaving(true);

    try {
      if (editingBookmark) {
        const updatedBookmark = await onUpdateBookmark(editingBookmark.id, input);

        setBookmarks((currentBookmarks) =>
          upsertBookmarkInList(currentBookmarks, updatedBookmark),
        );
        toast.success("Bookmark updated.");
      } else {
        const createdBookmark = await onCreateBookmark(input);

        setBookmarks((currentBookmarks) =>
          upsertBookmarkInList(currentBookmarks, createdBookmark),
        );
        setRecentlyDeleted((currentDeleted) =>
          currentDeleted.filter(
            (entry) => entry.bookmark.id !== createdBookmark.id,
          ),
        );
        toast.success("Bookmark saved.");
      }

      setSidebarView("library");
      closeModal();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : editingBookmark
            ? "Could not update the bookmark."
            : "Could not save the bookmark.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) {
      return;
    }

    const bookmarkToDelete = pendingDelete;
    setIsDeleting(true);

    try {
      await onDeleteBookmark(bookmarkToDelete.id);
      setBookmarks((currentBookmarks) =>
        removeBookmarkFromList(currentBookmarks, bookmarkToDelete.id),
      );
      rememberDeletedBookmark(bookmarkToDelete, setRecentlyDeleted);
      setPendingDelete(null);
      toast.success("Bookmark deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete the bookmark.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRestoreDeletedBookmark(bookmark: Bookmark) {
    setRestoringBookmarkId(bookmark.id);

    try {
      const restoredBookmark = await onCreateBookmark({
        url: bookmark.url,
        title: bookmark.title,
        tagsInput: bookmark.tags.join(", "),
      });

      setBookmarks((currentBookmarks) =>
        upsertBookmarkInList(currentBookmarks, restoredBookmark),
      );
      setRecentlyDeleted((currentDeleted) =>
        currentDeleted.filter((entry) => entry.bookmark.id !== bookmark.id),
      );
      setSidebarView("library");
      toast.success("Bookmark restored.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not restore the bookmark.",
      );
    } finally {
      setRestoringBookmarkId(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#f7fbfa_0%,#eff5f2_100%)] text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200/60 bg-slate-50/90 px-5 py-7 md:flex md:flex-col">
        <div className="mb-8 px-1">
          <p className="font-heading text-2xl font-extrabold text-slate-950">
            Collections
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Syncing...
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          <SidebarButton
            active={sidebarView === "library"}
            label="Library"
            icon={<Library className="size-4" />}
            onClick={() => setSidebarView("library")}
          />
          <SidebarButton
            active={sidebarView === "recentlyDeleted"}
            label="Recently deleted"
            icon={<Trash2 className="size-4" />}
            count={filteredDeletedBookmarks.length}
            onClick={() => setSidebarView("recentlyDeleted")}
          />
        </nav>

        <div className="mt-auto border-t border-slate-200/70 pt-5">
          <Button
            type="button"
            onClick={openCreateModal}
            className="h-12 w-full rounded-full bg-[linear-gradient(135deg,#005e60_0%,#3e9a68_100%)] px-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 hover:bg-[linear-gradient(135deg,#005e60_0%,#3e9a68_100%)]"
          >
            <BookmarkIcon className="size-4" />
            Add Bookmark
          </Button>
        </div>
      </aside>

      <main className="min-h-screen min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/82 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-5 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <BookmarkIcon className="size-5 text-primary" />
              <div className="font-heading text-2xl font-extrabold tracking-tight text-slate-950">
                Bookmarkly
              </div>
            </div>

            <div className="min-w-0 flex-1 justify-center px-2 lg:flex">
              <label className="flex w-full max-w-sm items-center rounded-xl bg-slate-100/90 px-4 py-2.5">
                <Search className="mr-3 size-4 text-slate-400" />
                <input
                  aria-label="Search bookmarks"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Search your library..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  aria-label="Open profile menu"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-200/50 transition-colors hover:bg-slate-50"
                  onClick={() => setIsProfileMenuOpen((open) => !open)}
                >
                  <Avatar size="lg">
                    <AvatarImage
                      alt={user.fullName ?? user.email ?? "User avatar"}
                      src={user.avatarUrl ?? undefined}
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.fullName ?? "Reader"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <ChevronDown className="size-4 text-slate-400" />
                </button>

                {isProfileMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 z-30 mt-2 min-w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/50"
                  >
                    <SignOutButton
                      variant="ghost"
                      size="default"
                      label="Sign Out"
                      className="w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8">
          <section className="mb-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
                  Personal Library
                </p>
                <h1 className="mt-2 font-heading text-4xl font-extrabold tracking-tight text-slate-950 md:text-6xl">
                  Good Morning, {firstName(user.fullName ?? user.email)}.
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                  Your curated space for ideas, articles, and inspiration.
                  Everything is synced and ready.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold shadow-sm transition-colors",
                    showTagFilters
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                  onClick={() => setShowTagFilters((current) => !current)}
                >
                  <Filter className="size-4" />
                  Filter
                </button>

                <div className="relative" ref={layoutMenuRef}>
                  <button
                    type="button"
                    aria-expanded={isLayoutMenuOpen}
                    aria-haspopup="menu"
                    data-layout-mode={layoutMode}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    onClick={() => setIsLayoutMenuOpen((open) => !open)}
                  >
                    Layout
                    <ChevronDown className="size-4 text-slate-400" />
                  </button>

                  {isLayoutMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-30 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/50"
                    >
                      {[
                        { label: "List", value: "list" as const },
                        { label: "Icons", value: "icons" as const },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          role="menuitem"
                          className={cn(
                            "flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                            layoutMode === item.value
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          )}
                          onClick={() => {
                            setLayoutMode(item.value);
                            setIsLayoutMenuOpen(false);
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {sidebarView === "library" && showTagFilters && allTags.length > 0 ? (
            <div className="mb-8 flex flex-wrap gap-3">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                    activeTag === tag
                      ? tagToneClass(tag, "active")
                      : tagToneClass(tag, "rest"),
                  )}
                  onClick={() =>
                    setActiveTag((currentTag) => (currentTag === tag ? null : tag))
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}

          {sidebarView === "library" ? (
            bookmarks.length === 0 ? (
              <EmptyState onOpenAdd={openCreateModal} />
            ) : visibleBookmarks.length === 0 ? (
              <MessageState
                title="No bookmarks match your current filters."
                body="Clear the search or tag filter to see the rest of your library."
              />
            ) : (
              <BookmarkCollection
                bookmarks={visibleBookmarks}
                layoutMode={layoutMode}
                onDelete={setPendingDelete}
                onEdit={openEditModal}
              />
            )
          ) : (
            <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
              <SectionHeader
                title="Recently deleted"
                description="Bookmarks removed in the last seven days."
              />
              <div className="px-6 pb-6 md:px-8">
                <RecentlyDeletedView
                  deletedBookmarks={filteredDeletedBookmarks}
                  onRestore={handleRestoreDeletedBookmark}
                  restoringBookmarkId={restoringBookmarkId}
                />
              </div>
            </section>
          )}
        </div>

        <button
          type="button"
          aria-label="Open add bookmark modal"
          className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#005e60_0%,#3e9a68_100%)] text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-[1.02] md:hidden"
          onClick={openCreateModal}
        >
          <Plus className="size-5" />
        </button>

        {isAddModalOpen ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#00464a]/18 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
          >
            <div className="absolute inset-0" onClick={closeModal} />
            <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.28)]">
              <div className="px-8 pb-8 pt-9">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-950">
                      {modalTitle}
                    </h2>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                      {modalDescription}
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <BookmarkIcon className="size-5" />
                  </div>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <div className="flex items-end justify-between gap-3">
                      <Label
                        htmlFor="bookmark-url"
                        className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-slate-500"
                      >
                        Destination URL
                      </Label>
                      {errors.url ? (
                        <span className="text-xs font-semibold text-red-600">
                          {errors.url}
                        </span>
                      ) : null}
                    </div>
                    <Input
                      id="bookmark-url"
                      aria-label="URL"
                      placeholder="https://example.com/design-journal"
                      className={cn(
                        "h-14 rounded-3xl border-slate-200 bg-slate-50 px-5 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-emerald-200",
                        errors.url ? "border-red-300" : "",
                      )}
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      aria-invalid={Boolean(errors.url)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-end justify-between gap-3">
                      <Label
                        htmlFor="bookmark-title"
                        className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-slate-500"
                      >
                        Article Title
                      </Label>
                      {errors.title ? (
                        <span className="text-xs font-semibold text-red-600">
                          {errors.title}
                        </span>
                      ) : null}
                    </div>
                    <Input
                      id="bookmark-title"
                      aria-label="Title"
                      placeholder="A clear title you will recognize later"
                      className={cn(
                        "h-14 rounded-3xl border-slate-200 bg-slate-50 px-5 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-emerald-200",
                        errors.title ? "border-red-300" : "",
                      )}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      aria-invalid={Boolean(errors.title)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="bookmark-tags"
                      className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-slate-500"
                    >
                      Tags
                    </Label>
                    <Input
                      id="bookmark-tags"
                      aria-label="Tags"
                      placeholder="design, docs, finance"
                      className="h-14 rounded-3xl border-slate-200 bg-slate-50 px-5 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                      value={tagsInput}
                      onChange={(event) => setTagsInput(event.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      aria-label={
                        editingBookmark ? undefined : "Add Bookmark Submit"
                      }
                      disabled={isSaving}
                      className="rounded-full bg-[linear-gradient(135deg,#005e60_0%,#3e9a68_100%)] px-7 py-2.5 text-sm font-bold text-white hover:bg-[linear-gradient(135deg,#005e60_0%,#3e9a68_100%)]"
                    >
                      {isSaving
                        ? editingBookmark
                          ? "Saving..."
                          : "Adding..."
                        : editingBookmark
                          ? "Save"
                          : "Add"}
                    </Button>
                  </div>
                </form>
              </div>
              <div className="h-1.5 w-full bg-[linear-gradient(90deg,#005e60_0%,#8ad3d7_52%,#cfe6f2_100%)]" />
            </div>
          </div>
        ) : null}

        <AlertDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) {
              setPendingDelete(null);
            }
          }}
        >
          {pendingDelete ? (
            <>
              <AlertDialogTrigger asChild>
                <span className="hidden" />
              </AlertDialogTrigger>
              <AlertDialogContent
                size="sm"
                className="w-[min(92vw,28rem)] max-w-[28rem] overflow-hidden border border-slate-200 bg-white/95 p-0 shadow-[0_40px_120px_rgba(15,23,42,0.24)] ring-0 backdrop-blur-xl"
              >
                <div className="p-8">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <Trash2 className="size-7" />
                  </div>
                  <AlertDialogTitle className="justify-center text-center font-heading text-3xl font-extrabold tracking-tight text-slate-950">
                    Delete Bookmark?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mx-auto mt-3 max-w-[320px] text-center text-sm leading-7 text-slate-600">
                    Are you sure you want to delete this bookmark? This action
                    cannot be undone and will remove it from all your synced
                    devices.
                  </AlertDialogDescription>

                  <div className="mt-7 grid w-full max-w-full grid-cols-[3rem_minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <div
                      className={cn(
                        "h-12 w-12 shrink-0 rounded-2xl",
                        thumbVisualClass(pendingDelete),
                      )}
                    />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {pendingDelete.title}
                      </p>
                      <p
                        className="mt-1 truncate text-xs text-slate-500"
                        title={pendingDelete.url}
                      >
                        {pendingDelete.url}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <AlertDialogCancel
                      variant="secondary"
                      className="rounded-full bg-slate-100 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                      disabled={isDeleting}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="default"
                      className="rounded-full bg-[linear-gradient(135deg,#b91c1c_0%,#dc2626_100%)] py-3 text-sm font-semibold text-white hover:bg-[linear-gradient(135deg,#b91c1c_0%,#dc2626_100%)]"
                      disabled={isDeleting}
                      onClick={handleDelete}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </div>
                </div>
              </AlertDialogContent>
            </>
          ) : null}
        </AlertDialog>
      </main>
    </div>
  );
}

function SidebarButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "flex w-full items-center justify-between rounded-[22px] px-4 py-3 text-left transition-colors",
        active
          ? "bg-emerald-50 text-emerald-800"
          : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-3 text-sm font-semibold">
        {icon}
        {label}
      </span>
      {typeof count === "number" ? (
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 shadow-sm">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SectionHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="border-b border-slate-100 px-6 py-5 md:px-8">
      <h2 className="font-heading text-2xl font-extrabold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function EmptyState({ onOpenAdd }: { onOpenAdd: () => void }) {
  return (
    <div className="flex min-h-full items-center justify-center py-10">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <BookmarkIcon className="size-6" />
        </div>
        <h3 className="mt-5 font-heading text-3xl font-extrabold tracking-tight text-slate-950">
          Your bookmarks stay private to your account.
        </h3>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Save your first link to start building a personal library that syncs
          across tabs.
        </p>
        <Button
          type="button"
          className="mt-6 rounded-full bg-[linear-gradient(135deg,#005e60_0%,#3e9a68_100%)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[linear-gradient(135deg,#005e60_0%,#3e9a68_100%)]"
          onClick={onOpenAdd}
        >
          Create first bookmark
        </Button>
      </div>
    </div>
  );
}

function MessageState({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  return (
    <div className="flex min-h-full items-center justify-center py-10">
      <div className="max-w-lg rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-8 py-10 text-center">
        <h3 className="font-heading text-2xl font-extrabold text-slate-950">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
      </div>
    </div>
  );
}

function RecentlyDeletedView({
  deletedBookmarks,
  onRestore,
  restoringBookmarkId,
}: {
  deletedBookmarks: DeletedBookmark[];
  onRestore: (bookmark: Bookmark) => Promise<void>;
  restoringBookmarkId: string | null;
}) {
  if (deletedBookmarks.length === 0) {
    return (
      <MessageState
        title="Nothing deleted recently"
        body="When you delete a bookmark it will stay visible here for seven days."
      />
    );
  }

  return (
    <div className="space-y-3 py-5">
      {deletedBookmarks.map((entry) => (
        <div
          key={entry.bookmark.id}
          className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-950">
                {entry.bookmark.title}
              </p>
              <p className="mt-1 truncate text-sm text-slate-500">
                {entry.bookmark.url}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {deletedLabel(entry.deletedAt)}
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              aria-label={`Restore ${entry.bookmark.title}`}
              className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              disabled={restoringBookmarkId === entry.bookmark.id}
              onClick={() => void onRestore(entry.bookmark)}
            >
              {restoringBookmarkId === entry.bookmark.id ? "Restoring..." : "Restore"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BookmarkCollection({
  bookmarks,
  layoutMode,
  onDelete,
  onEdit,
}: {
  bookmarks: Bookmark[];
  layoutMode: LayoutMode;
  onDelete: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
}) {
  if (layoutMode === "list") {
    return (
      <BookmarkList
        bookmarks={bookmarks}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    );
  }

  if (layoutMode === "icons") {
    return (
      <BookmarkIcons
        bookmarks={bookmarks}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    );
  }

  return (
    <BookmarkIcons
      bookmarks={bookmarks}
      onDelete={onDelete}
      onEdit={onEdit}
    />
  );
}

function BookmarkList({
  bookmarks,
  onDelete,
  onEdit,
}: {
  bookmarks: Bookmark[];
  onDelete: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
}) {
  return (
    <div className="space-y-4 py-5">
      {bookmarks.map((bookmark) => (
        <article
          key={bookmark.id}
          className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm shadow-slate-200/45 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/60"
        >
          <div className="flex flex-col gap-0 md:flex-row">
            <div
              className={cn(
                "relative flex h-40 items-end overflow-hidden px-5 py-5 md:h-auto md:w-56 md:shrink-0",
                heroVisualClass(bookmark),
              )}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,rgba(15,23,42,0.12)_100%)]" />
              <div className="relative z-10 flex items-end justify-between gap-3 w-full">
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-lg font-bold text-slate-700 shadow-sm backdrop-blur-sm">
                    {bookmarkMonogram(bookmark)}
                  </span>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700/80">
                    {bookmarkDomain(bookmark.url)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col p-6 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      {bookmark.tags[0] ?? "saved"}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {bookmarkAgeLabel(bookmark.created_at)}
                    </span>
                  </div>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-start gap-2 font-heading text-3xl font-extrabold leading-tight tracking-tight text-slate-950 transition-colors hover:text-emerald-700"
                  >
                    <span className="line-clamp-2">{bookmark.title}</span>
                    <ExternalLink className="mt-1 size-4 shrink-0" />
                  </a>
                  <BookmarkUrl
                    url={bookmark.url}
                    href={bookmark.url}
                    className="mt-3 max-w-full"
                    textClassName="text-sm leading-7 text-slate-500"
                  />
                </div>
                <BookmarkActions
                  bookmark={bookmark}
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <BookmarkTags bookmark={bookmark} compact />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Library
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function BookmarkIcons({
  bookmarks,
  onDelete,
  onEdit,
}: {
  bookmarks: Bookmark[];
  onDelete: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 xl:grid-cols-3">
      {bookmarks.map((bookmark) => (
        <article
          key={bookmark.id}
          className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm shadow-slate-200/45 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/60"
        >
          <div
            className={cn(
              "relative flex h-40 items-end overflow-hidden px-5 py-5",
              heroVisualClass(bookmark),
            )}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(15,23,42,0.16)_100%)]" />
            <div className="relative z-10 flex w-full items-end justify-between gap-3">
              <span className="rounded-full bg-white/24 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                {bookmark.tags[0] ?? "saved"}
              </span>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-lg font-bold text-slate-700 shadow-sm backdrop-blur-sm">
                {bookmarkMonogram(bookmark)}
              </span>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {bookmarkDomain(bookmark.url)}
                </p>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-start gap-2 font-heading text-2xl font-extrabold leading-tight tracking-tight text-slate-950 transition-colors hover:text-emerald-700"
                >
                  <span className="line-clamp-2">{bookmark.title}</span>
                  <ExternalLink className="mt-1 size-3.5 shrink-0" />
                </a>
              </div>
              <BookmarkActions
                bookmark={bookmark}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <BookmarkTags bookmark={bookmark} compact />
              <span className="shrink-0 text-xs text-slate-400">
                {bookmarkAgeLabel(bookmark.created_at)}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function BookmarkUrl({
  className,
  href,
  textClassName,
  tooltipSide = "bottom",
  url,
}: {
  className?: string;
  href?: string;
  textClassName?: string;
  tooltipSide?: "bottom" | "top";
  url: string;
}) {
  const tooltipPositionClass =
    tooltipSide === "top"
      ? "bottom-full mb-2"
      : "top-full mt-2";

  const sharedClasses = cn(
    "group/url relative block min-w-0 max-w-full",
    className,
  );
  const textClasses = cn("block truncate", textClassName);

  const tooltip = (
    <span
      className={cn(
        "pointer-events-none absolute left-0 z-30 hidden w-max max-w-[min(32rem,calc(100vw-4rem))] rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-left text-xs leading-5 text-slate-700 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-sm group-hover/url:block group-focus-visible/url:block",
        tooltipPositionClass,
      )}
    >
      <span className="block break-all">{url}</span>
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={url}
        className={sharedClasses}
      >
        <span className={textClasses}>{url}</span>
        {tooltip}
      </a>
    );
  }

  return (
    <div className={sharedClasses} title={url}>
      <span className={textClasses}>{url}</span>
      {tooltip}
    </div>
  );
}

function BookmarkActions({
  bookmark,
  onDelete,
  onEdit,
}: {
  bookmark: Bookmark;
  onDelete: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Edit ${bookmark.title}`}
        className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:border-emerald-200 hover:text-emerald-700"
        onClick={() => onEdit(bookmark)}
      >
        <PencilLine className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Delete ${bookmark.title}`}
        className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:border-red-200 hover:text-red-600"
        onClick={() => onDelete(bookmark)}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function BookmarkTags({
  bookmark,
  compact = false,
}: {
  bookmark: Bookmark;
  compact?: boolean;
}) {
  const tags = bookmark.tags.length > 0 ? bookmark.tags : ["bookmark"];

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={`${bookmark.id}-${tag}`}
          className={cn(
            "rounded-full border font-semibold",
            tagToneClass(tag, "rest"),
            compact
              ? "px-2 py-0.5 text-[11px]"
              : "px-2.5 py-1 text-xs",
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function firstName(value: string | null) {
  if (!value) {
    return "Reader";
  }

  return value.split(" ")[0] ?? value;
}

function bookmarkDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function bookmarkMonogram(bookmark: Bookmark) {
  const base = bookmarkDomain(bookmark.url).replace(/\.[^.]+$/, "");
  return (base.slice(0, 2) || "BK").toUpperCase();
}

function thumbVisualClass(bookmark: Bookmark) {
  const key = bookmark.tags[0]?.toLowerCase() ?? "";

  if (key.includes("backend") || key.includes("code")) {
    return "bg-[linear-gradient(135deg,#dbe6f4_0%,#eef5fb_100%)]";
  }

  if (key.includes("finance") || key.includes("bank")) {
    return "bg-[linear-gradient(135deg,#e5eddc_0%,#f4f7ef_100%)]";
  }

  return "bg-[linear-gradient(135deg,#e7f1ed_0%,#f7faf9_100%)]";
}

function heroVisualClass(bookmark: Bookmark) {
  const key = bookmark.tags[0]?.toLowerCase() ?? "";

  if (key.includes("design")) {
    return "bg-[linear-gradient(135deg,#d6ebe5_0%,#edf5ef_48%,#bfd6c4_100%)]";
  }

  if (key.includes("backend") || key.includes("code")) {
    return "bg-[linear-gradient(135deg,#d7e4f2_0%,#eef4fb_48%,#c4d5e9_100%)]";
  }

  if (key.includes("finance") || key.includes("bank")) {
    return "bg-[linear-gradient(135deg,#e6edd7_0%,#f4f7ea_48%,#d6e2ba_100%)]";
  }

  if (key.includes("social") || key.includes("media")) {
    return "bg-[linear-gradient(135deg,#d9efe7_0%,#eff8f4_45%,#bde1d4_100%)]";
  }

  return "bg-[linear-gradient(135deg,#e6efeb_0%,#f7faf9_55%,#dce6ef_100%)]";
}

function tagToneClass(tag: string, state: "rest" | "active") {
  const palettes = [
    {
      rest: "border-sky-200 bg-sky-50 text-sky-700",
      active: "border-sky-600 bg-sky-600 text-white",
    },
    {
      rest: "border-emerald-200 bg-emerald-50 text-emerald-700",
      active: "border-emerald-700 bg-emerald-700 text-white",
    },
    {
      rest: "border-violet-200 bg-violet-50 text-violet-700",
      active: "border-violet-700 bg-violet-700 text-white",
    },
    {
      rest: "border-amber-200 bg-amber-50 text-amber-700",
      active: "border-amber-600 bg-amber-600 text-white",
    },
    {
      rest: "border-rose-200 bg-rose-50 text-rose-700",
      active: "border-rose-600 bg-rose-600 text-white",
    },
    {
      rest: "border-teal-200 bg-teal-50 text-teal-700",
      active: "border-teal-700 bg-teal-700 text-white",
    },
  ] as const;

  const hash = Array.from(tag.toLowerCase()).reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0,
  );
  const palette = palettes[hash % palettes.length];

  return palette[state];
}

function rememberDeletedBookmark(
  bookmark: Bookmark,
  setRecentlyDeleted: React.Dispatch<React.SetStateAction<DeletedBookmark[]>>,
) {
  setRecentlyDeleted((currentDeleted) =>
    sanitizeDeletedBookmarks([
      {
        bookmark,
        deletedAt: new Date().toISOString(),
      },
      ...currentDeleted.filter((entry) => entry.bookmark.id !== bookmark.id),
    ]),
  );
}

function sanitizeDeletedBookmarks(entries: DeletedBookmark[]) {
  const cutoff = Date.now() - RECENTLY_DELETED_WINDOW_MS;

  return entries
    .filter((entry) => {
      const deletedAt = new Date(entry.deletedAt).getTime();
      return Number.isFinite(deletedAt) && deletedAt >= cutoff;
    })
    .sort(
      (left, right) =>
        new Date(right.deletedAt).getTime() - new Date(left.deletedAt).getTime(),
    );
}

function readDeletedBookmarks(storageKey: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as DeletedBookmark[];
    return sanitizeDeletedBookmarks(parsedValue);
  } catch {
    return [];
  }
}

function filterDeletedBookmarks(
  deletedBookmarks: DeletedBookmark[],
  searchQuery: string,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return sanitizeDeletedBookmarks(deletedBookmarks);
  }

  return sanitizeDeletedBookmarks(deletedBookmarks).filter(({ bookmark }) => {
    const haystack = [bookmark.title, bookmark.url, ...bookmark.tags]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function deletedLabel(deletedAt: string) {
  const diffHours = Math.max(
    1,
    Math.round((Date.now() - new Date(deletedAt).getTime()) / 3_600_000),
  );

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function bookmarkAgeLabel(createdAt: string) {
  const diffHours = Math.max(
    1,
    Math.round((Date.now() - new Date(createdAt).getTime()) / 3_600_000),
  );

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export type { BookmarkDashboardProps, DashboardUser };
