"use client";

import type { LucideIcon } from "lucide-react";
import {
  Home,
  LayoutGrid,
  Monitor,
  Moon,
  Palette,
  Search,
  Sun,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  categories,
  getAllComponents,
  getComponentsByCategory,
} from "@/lib/component-registry";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

const nav: { name: string; path: string; icon: LucideIcon }[] = [
  { name: "Home", path: "/", icon: Home },
  { name: "Foundations", path: "/foundations", icon: Palette },
  { name: "Components", path: "/components", icon: LayoutGrid },
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
        title="Search components"
        description="Search for a component by name"
      >
        <CommandInput placeholder="Search components..." />
        <CommandList>
          <CommandEmpty>No components found.</CommandEmpty>

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
            <CommandItem
              onSelect={() => {
                navigate("/foundations/colors");
                setSearchOpen(false);
              }}
            >
              <Palette className="mr-2 size-4" />
              Colors
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/foundations/typography");
                setSearchOpen(false);
              }}
            >
              <Palette className="mr-2 size-4" />
              Typography
            </CommandItem>
          </CommandGroup>

          {categories.map((cat) => {
            const items = getComponentsByCategory(cat.slug);
            if (items.length === 0) return null;
            return (
              <CommandGroup key={cat.slug} heading={cat.name}>
                {items.map((item) => (
                  <CommandItem
                    key={item.slug}
                    onSelect={() => {
                      navigate(`/components/${item.slug}`);
                      setSearchOpen(false);
                    }}
                  >
                    {item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
