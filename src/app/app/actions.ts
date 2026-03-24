"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normalizeBookmarkUrl, parseBookmarkTags } from "@/lib/bookmarks";
import { createClient } from "@/lib/supabase/server";
import type { Bookmark, BookmarkFormInput } from "@/lib/types";

const bookmarkInputSchema = z.object({
  url: z.string().trim().min(1, "URL is required."),
  title: z.string().trim().min(1, "Title is required."),
  tagsInput: z.string(),
});

export async function createBookmarkAction(input: BookmarkFormInput) {
  const supabase = await createClient();
  const parsedInput = bookmarkInputSchema.parse(input);
  const normalizedUrl = normalizeBookmarkUrl(parsedInput.url);
  const tags = parseBookmarkTags(parsedInput.tagsInput);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to save bookmarks.");
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: user.id,
      url: normalizedUrl,
      title: parsedInput.title.trim(),
      tags,
    })
    .select("*")
    .single<Bookmark>();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");

  return data;
}

export async function deleteBookmarkAction(bookmarkId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to delete bookmarks.");
  }

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", bookmarkId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
}

export async function updateBookmarkAction(
  bookmarkId: string,
  input: BookmarkFormInput,
) {
  const supabase = await createClient();
  const parsedInput = bookmarkInputSchema.parse(input);
  const normalizedUrl = normalizeBookmarkUrl(parsedInput.url);
  const tags = parseBookmarkTags(parsedInput.tagsInput);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to edit bookmarks.");
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .update({
      url: normalizedUrl,
      title: parsedInput.title.trim(),
      tags,
    })
    .eq("id", bookmarkId)
    .eq("user_id", user.id)
    .select("*")
    .single<Bookmark>();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");

  return data;
}
