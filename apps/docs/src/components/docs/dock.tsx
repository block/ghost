"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  cn,
  useTheme,
} from "@design-intelligence/vessel-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

const nav = [
  { name: "home", path: "/" },
  { name: "docs", path: "/docs", activePath: "/docs" },
] as const;

const searchPages = [
  { label: "home", path: "/" },
  { label: "getting started", path: "/docs/getting-started" },
  { label: "authoring", path: "/docs/authoring" },
  { label: "checks and review", path: "/docs/checks-and-review" },
  { label: "cli reference", path: "/docs/cli" },
  { label: "troubleshooting", path: "/docs/troubleshooting" },
] as const;

export function Dock() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cycleTheme = useCallback(() => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }, [theme, setTheme]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const isActive = useCallback(
    (path: string, activePath = path) => {
      if (path === "/") return pathname === "/";
      return pathname.startsWith(activePath);
    },
    [pathname],
  );

  const go = (path: string) => {
    navigate(path);
    setSearchOpen(false);
  };

  return (
    <>
      <nav
        className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center justify-center pb-[env(safe-area-inset-bottom)]"
        aria-label="primary"
      >
        <div className="doc-dock rounded-squircle pointer-events-auto flex items-stretch border border-[var(--doc-line)] bg-background">
          {nav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex min-h-9 items-center border-r border-[var(--doc-line)] px-[1.5ch] text-xs lowercase no-underline",
                isActive(
                  item.path,
                  "activePath" in item ? item.activePath : item.path,
                )
                  ? "bg-[var(--doc-mark)] text-[var(--doc-on-mark)]"
                  : "text-[var(--doc-middle)] hover:bg-[var(--doc-mark-soft)] hover:text-foreground",
              )}
            >
              {item.name}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="min-h-9 border-r border-[var(--doc-line)] px-[1.5ch] text-xs text-[var(--doc-middle)] hover:bg-[var(--doc-mark-soft)] hover:text-foreground"
            aria-label="search documentation"
          >
            ⌘k
          </button>
          <button
            type="button"
            onClick={cycleTheme}
            className="min-h-9 px-[1.5ch] text-xs lowercase text-[var(--doc-middle)] hover:bg-[var(--doc-mark-soft)] hover:text-foreground"
            aria-label={`theme: ${mounted ? theme : "system"}. activate to change`}
          >
            {mounted ? (theme === "system" ? "auto" : theme) : "auto"}
          </button>
        </div>
      </nav>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="search"
        description="jump to a page"
      >
        <CommandInput placeholder="search documentation…" />
        <CommandList>
          <CommandEmpty>no matches.</CommandEmpty>
          <CommandGroup heading="pages">
            {searchPages.map((page, index) => (
              <CommandItem key={page.path} onSelect={() => go(page.path)}>
                <span className="mr-[2ch] text-[var(--doc-middle)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
