export type Bookmark = {
  id: string;
  user_id: string;
  url: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type BookmarkFormInput = {
  url: string;
  title: string;
  tagsInput: string;
};
