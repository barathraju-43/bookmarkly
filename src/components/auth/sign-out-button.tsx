"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  label?: string;
} & Pick<React.ComponentProps<typeof Button>, "size" | "variant"> &
  VariantProps<typeof Button>;

export function SignOutButton({
  className,
  label = "Sign out",
  size = "sm",
  variant = "outline",
}: SignOutButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setIsPending(true);

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/?auth=signed-out");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => {
        void handleSignOut();
      }}
      disabled={isPending}
    >
      <LogOut className="size-4" />
      {isPending ? "Signing out..." : label}
    </Button>
  );
}
