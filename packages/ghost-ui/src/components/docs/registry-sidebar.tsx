"use client";

import { ChevronDown, Menu, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  type ComponentEntry,
  categories,
  getComponentsByCategory,
} from "@/lib/component-registry";

const topNav = [
  { name: "home", path: "/" },
  { name: "colors", path: "/foundations/colors" },
  { name: "typography", path: "/foundations/typography" },
  { name: "all components", path: "/components" },
];

export function RegistrySidebar() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();

  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return categories
      .map((cat) => {
        const items = getComponentsByCategory(cat.slug);
        const filtered = term
          ? items.filter((item) => item.name.toLowerCase().includes(term))
          : items;
        return { ...cat, items: filtered };
      })
      .filter((cat) => cat.items.length > 0);
  }, [searchTerm]);

  const hasSearch = searchTerm.length > 0;

  return (
    <>
      <Button
        aria-label="Open menu"
        onClick={() => setOpenMobile(true)}
        appearance="icon"
        size="lg"
        className="hover:scale-105 sticky z-50 top-4 ml-6 md:hidden"
      >
        <Menu className="size-5" />
      </Button>

      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader className="border-b">
          <div className="px-2 py-2 opacity-100 transition-all duration-200">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {!hasSearch && (
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex cursor-pointer items-center justify-between">
                    <span className="opacity-100 transition-all duration-200">
                      get started
                    </span>
                    <ChevronDown className="size-4 flex-shrink-0 opacity-100 transition-all duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {topNav.map((item) => (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname === item.path}
                          >
                            <Link
                              to={item.path}
                              onClick={() => setOpenMobile(false)}
                            >
                              <span className="opacity-100 transition-all duration-200">
                                {item.name}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )}

          {filteredCategories.map((cat) => (
            <CategorySection
              key={cat.slug}
              label={cat.name}
              items={cat.items}
              pathname={pathname}
              defaultOpen={hasSearch}
              onNavigate={() => setOpenMobile(false)}
            />
          ))}
        </SidebarContent>
      </Sidebar>
    </>
  );
}

function CategorySection({
  label,
  items,
  pathname,
  defaultOpen,
  onNavigate,
}: {
  label: string;
  items: ComponentEntry[];
  pathname: string;
  defaultOpen: boolean;
  onNavigate: () => void;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarGroup>
        <CollapsibleTrigger className="w-full">
          <SidebarGroupLabel className="flex cursor-pointer items-center justify-between">
            <span className="transition-all duration-200">{label}</span>
            <ChevronDown className="size-4 flex-shrink-0 transition-all duration-200 group-data-[state=open]/collapsible:rotate-180" />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.slug}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/components/${item.slug}`}
                  >
                    <Link to={`/components/${item.slug}`} onClick={onNavigate}>
                      {item.name}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
