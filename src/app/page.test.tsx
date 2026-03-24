// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home page", () => {
  it("renders the Stitch-inspired landing shell and Google sign-in CTA", async () => {
    render(await Home());

    expect(screen.getAllByText("Bookmarkly")).not.toHaveLength(0);
    expect(
      screen.getByText("Save, organize, and sync your bookmarks effortlessly"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Transform your digital chaos into a curated library. Bookmarkly is the editorial archive for your most important links, articles, and research.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("API Docs")).toBeInTheDocument();
  });
});
