"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useTheme,
} from "ghost-ui";
import type { LucideIcon } from "lucide-react";
import { Home, Monitor, Moon, Search, Sun, Wrench } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

const nav: { name: string; path: string; icon: LucideIcon }[] = [
  { name: "Home", path: "/", icon: Home },
  { name: "Tools", path: "/tools", icon: Wrench },
];

export function Dock() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = useCallback(() => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }, [theme, setTheme]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return pathname === "/";
      return pathname.startsWith(path);
    },
    [pathname],
  );

  return (
    <>
      {/* Dock: bottom center, horizontal on all screens */}
      <nav
        className="fixed bottom-6 left-1/2 z-50 flex items-center justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none"
        style={{
          transform:
            "translateX(calc(-50% - var(--removed-body-scroll-bar-size, 0px) / 2))",
        }}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
          className="flex items-center gap-1 rounded-full border bg-background/80 backdrop-blur-xl p-2 shadow-elevated pointer-events-auto"
        >
          {nav.map((item) => (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full transition-all duration-200",
                    isActive(item.path)
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <item.icon className="size-5" strokeWidth={1.75} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                {item.name}
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="my-auto mx-1 w-px h-5 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSearchOpen(true)}
                className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted"
              >
                <Search className="size-5" strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Search
              <span className="ml-2 text-[10px] opacity-60">&#8984;K</span>
            </TooltipContent>
          </Tooltip>

          <div className="my-auto mx-1 w-px h-5 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={cycleTheme}
                className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted"
              >
                {mounted && (
                  <motion.div
                    key={theme}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {theme === "system" ? (
                      <Monitor className="size-[18px]" strokeWidth={1.75} />
                    ) : theme === "dark" ? (
                      <Moon className="size-[18px]" strokeWidth={1.75} />
                    ) : (
                      <Sun className="size-[18px]" strokeWidth={1.75} />
                    )}
                  </motion.div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {mounted
                ? theme === "system"
                  ? "System"
                  : theme === "dark"
                    ? "Dark"
                    : "Light"
                : "Theme"}
            </TooltipContent>
          </Tooltip>
        </motion.div>
      </nav>

      {/* Search command palette */}
      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search"
        description="Jump to a page"
      >
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>

          <CommandGroup heading="Pages">
            <CommandItem
              onSelect={() => {
                navigate("/");
                setSearchOpen(false);
              }}
            >
              <Home className="mr-2 size-4" />
              Home
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Tools">
            <CommandItem
              onSelect={() => {
                navigate("/tools/map");
                setSearchOpen(false);
              }}
            >
              <Wrench className="mr-2 size-4" />
              ghost-map
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/tools/expression");
                setSearchOpen(false);
              }}
            >
              <Wrench className="mr-2 size-4" />
              ghost-expression
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/tools/drift");
                setSearchOpen(false);
              }}
            >
              <Wrench className="mr-2 size-4" />
              ghost-drift
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/tools/fleet");
                setSearchOpen(false);
              }}
            >
              <Wrench className="mr-2 size-4" />
              ghost-fleet
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/tools/ui");
                setSearchOpen(false);
              }}
            >
              <Wrench className="mr-2 size-4" />
              ghost-ui
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Docs">
            <CommandItem
              onSelect={() => {
                navigate("/docs/getting-started");
                setSearchOpen(false);
              }}
            >
              <Wrench className="mr-2 size-4" />
              Getting Started
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/docs/cli");
                setSearchOpen(false);
              }}
            >
              <Wrench className="mr-2 size-4" />
              CLI Reference
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/tools/drift/workflow");
                setSearchOpen(false);
              }}
            >
              <Wrench className="mr-2 size-4" />
              Drift Workflow
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
