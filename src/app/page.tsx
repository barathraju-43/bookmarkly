import { Bookmark, FolderKanban, Search } from "lucide-react";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

const authMessages: Record<string, string> = {
  "oauth-error": "Google sign-in did not complete. Try again from the landing page.",
  "signin-required": "Sign in with Google to open your private bookmark workspace.",
  "signed-out": "You are signed out.",
};

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomePageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const authStatus =
    typeof resolvedSearchParams?.auth === "string"
      ? resolvedSearchParams.auth
      : undefined;
  const authMessage = authStatus ? authMessages[authStatus] : undefined;

  return (
    <>
      <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-white/80 px-6 py-4 shadow-sm shadow-cyan-900/5 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Bookmark className="size-6 text-primary" />
          <h1 className="font-heading text-xl font-extrabold tracking-tight text-cyan-900">
            Bookmarkly
          </h1>
        </div>
        {/* <div className="hidden items-center gap-6 md:flex">
          <div className="h-4 w-px bg-border/40" />
          <GoogleSignInButton label="Log In" variant="header" />
        </div> */}
      </header>

      <main className="flex min-h-screen flex-col pt-20 md:flex-row">
        <section className="flex flex-1 flex-col justify-center px-8 py-12 md:px-20 lg:px-32">
          <div className="max-w-xl">
            {/* <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">
              <Sparkles className="size-4" />
              <span>Now with AI-powered tagging</span> 
            </div> */}
            <h2 className="mb-6 font-heading text-4xl leading-tight font-extrabold tracking-tight text-primary md:text-6xl">
              Save, organize, and sync your bookmarks effortlessly
            </h2>
            <p className="mb-10 text-lg leading-relaxed text-on-surface-variant md:text-xl">
              Transform your digital chaos into a curated library. Bookmarkly is
              the editorial archive for your most important links, articles, and
              research.
            </p>

            <div className="space-y-4">
              <GoogleSignInButton className="w-full md:w-auto" />
              <p className="px-4 text-sm text-on-surface-variant/60">
                By signing in, you agree to our{" "}
                <a className="underline transition-colors hover:text-primary" href="#">
                  Terms of Service
                </a>
                .
              </p>
              {authMessage ? (
                <div className="max-w-xl rounded-xl border border-error/15 bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {authMessage}
                </div>
              ) : null}
            </div>

            <div className="mt-16 flex items-center gap-8 opacity-50 grayscale">
              <div className="h-6 w-20 rounded-full bg-surface-container-highest" />
              <div className="h-6 w-16 rounded-full bg-surface-container-highest" />
              <div className="h-6 w-24 rounded-full bg-surface-container-highest" />
            </div>
          </div>
        </section>

        <section className="relative hidden flex-1 items-center justify-center overflow-hidden bg-surface-container-low lg:flex">
          <div className="absolute top-0 right-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-fixed/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-secondary-container/20 blur-3xl" />

          <div className="relative grid w-full max-w-2xl grid-cols-12 gap-6 p-12">
            <div className="col-span-8 rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-xl shadow-cyan-900/5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container text-on-primary">
                  <Bookmark className="size-5" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-32 rounded-full bg-surface-container-highest" />
                  <div className="h-2 w-20 rounded-full bg-surface-container-high" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full rounded-md bg-surface-container-low" />
                <div className="h-4 w-5/6 rounded-md bg-surface-container-low" />
              </div>
              <div className="mt-6 flex gap-2">
                <span className="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-secondary-container">
                  Design
                </span>
                <span className="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-secondary-container">
                  Architecture
                </span>
              </div>
            </div>

            <div className="-translate-y-4 -rotate-3 col-span-4 flex flex-col justify-between rounded-xl bg-primary-container p-6 text-on-primary shadow-lg transition-all duration-500 hover:rotate-0">
              <FolderKanban className="size-10" />
              <div>
                <p className="font-heading text-sm font-bold">Always in sync</p>
                <p className="text-xs opacity-70">Last synced 2m ago</p>
              </div>
            </div>

            <div className="-rotate-1 col-span-5 translate-x-8 rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-lg transition-all duration-500 hover:rotate-0">
              <div className="mb-4 flex items-center justify-between">
                <FolderKanban className="size-5 text-secondary" />
                <span className="text-[10px] font-bold text-slate-400">128 ITEMS</span>
              </div>
              <p className="mb-2 font-heading font-bold text-primary">Research Paper</p>
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-200" />
                <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-300" />
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-[10px] font-bold text-white">
                  +5
                </div>
              </div>
            </div>

            <div className="col-span-7 -translate-y-8 translate-x-4 rotate-2 rounded-xl border border-white/50 bg-white/40 p-4 shadow-sm backdrop-blur-md transition-all duration-500 hover:rotate-0">
              <div className="flex items-center gap-3 text-slate-400">
                <Search className="size-5" />
                <span className="text-sm font-medium">Search across tags...</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant/10 bg-surface-container-lowest px-8 py-12 md:px-20 lg:px-32">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <Bookmark className="size-5 text-primary" />
            <span className="font-heading font-extrabold text-primary">Bookmarkly</span>
          </div>
          <nav className="flex flex-wrap gap-8 text-sm font-medium text-slate-500">
            <a className="transition-colors hover:text-primary" href="#">
              Privacy Policy
            </a>
            <a className="transition-colors hover:text-primary" href="#">
              Terms of Service
            </a>
            <a className="transition-colors hover:text-primary" href="#">
              Contact
            </a>
            <a className="transition-colors hover:text-primary" href="#">
              API Docs
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
