"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type GoogleSignInButtonProps = {
  className?: string;
  label?: string;
  variant?: "primary" | "header";
};

export function GoogleSignInButton({
  className,
  label = "Continue with Google",
  variant = "primary",
}: GoogleSignInButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function handleSignIn() {
    if (!isConfigured) {
      return;
    }

    setIsPending(true);

    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin).toString();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setIsPending(false);
      throw error;
    }
  }

  return (
    <Button
      type="button"
      size={variant === "header" ? "sm" : "lg"}
      className={cn(
        variant === "header"
          ? "rounded-full border border-outline-variant/20 bg-white/70 px-5 text-sm font-bold text-primary shadow-sm shadow-cyan-900/5 backdrop-blur-md hover:bg-white"
          : "h-14 rounded-full border-0 bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)] px-8 text-base font-bold text-white shadow-lg shadow-primary/20 hover:scale-[1.02] hover:bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)]",
        className,
      )}
      onClick={() => {
        void handleSignIn();
      }}
      disabled={isPending || !isConfigured}
    >
      <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
          fill="currentColor"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
          fill="currentColor"
          opacity="0.86"
        />
        <path
          d="M5.84 14.09A6.96 6.96 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A10.98 10.98 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
          fill="currentColor"
          opacity="0.72"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
          fill="currentColor"
          opacity="0.58"
        />
      </svg>
      {isPending ? "Redirecting..." : label}
    </Button>
  );
}
