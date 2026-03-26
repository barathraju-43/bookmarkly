// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = {
  getAll: vi.fn(() => []),
  set: vi.fn(),
};

const createServerClientMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

describe("auth callback route", () => {
  beforeEach(() => {
    cookieStore.getAll.mockClear();
    cookieStore.set.mockClear();
    createServerClientMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("forwards auth cookies on the redirect response after exchanging the code", async () => {
    createServerClientMock.mockImplementation(
      (
        _url: string,
        _key: string,
        options: {
          cookies: {
            setAll: (
              cookiesToSet: Array<{
                name: string;
                value: string;
                options?: Record<string, unknown>;
              }>,
            ) => void;
          };
        },
      ) => ({
        auth: {
          exchangeCodeForSession: async () => {
            options.cookies.setAll([
              {
                name: "sb-access-token",
                value: "cookie-value",
                options: { path: "/" },
              },
            ]);

            return { error: null };
          },
        },
      }),
    );

    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/callback?code=test-code"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/app");
    expect(response.cookies.get("sb-access-token")?.value).toBe("cookie-value");
  });
});
