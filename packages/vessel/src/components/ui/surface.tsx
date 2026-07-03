import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const surfaceVariants = cva("", {
  variants: {
    role: {
      default: "bg-background text-foreground",
      card: "bg-card text-card-foreground",
      popover: "bg-popover text-popover-foreground",
      muted: "bg-muted text-foreground",
      accent: "bg-accent text-accent-foreground",
      dark: "bg-surface-dark text-surface-dark-text",
    },
    padding: {
      none: "p-0",
      xs: "p-2",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
    radius: {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      card: "rounded-card",
      pill: "rounded-pill",
    },
    border: {
      none: "border-0",
      default: "border border-border",
      input: "border border-input",
    },
    elevation: {
      none: "shadow-none",
      card: "shadow-card",
      popover: "shadow-popover",
      modal: "shadow-modal",
    },
  },
  defaultVariants: {
    role: "default",
    padding: "none",
    radius: "md",
    border: "none",
    elevation: "none",
  },
});

function Surface({
  className,
  role,
  padding,
  radius,
  border,
  elevation,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof surfaceVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="surface"
      data-role={role}
      className={cn(
        surfaceVariants({ role, padding, radius, border, elevation }),
        className,
      )}
      {...props}
    />
  );
}

export { Surface, surfaceVariants };
