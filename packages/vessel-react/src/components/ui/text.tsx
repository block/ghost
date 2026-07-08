import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const textVariants = cva("", {
  variants: {
    variant: {
      display: "font-display text-6xl font-normal leading-none tracking-tight",
      headline:
        "font-display text-2xl font-normal leading-tight tracking-tight",
      title: "font-display text-lg font-semibold leading-none tracking-tight",
      body: "font-sans text-sm leading-relaxed",
      label: "font-sans text-xs font-medium leading-none tracking-wide",
      mono: "font-mono text-sm",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      inverse: "text-primary-foreground",
      success: "text-success",
      warning: "text-warning",
      info: "text-info",
      destructive: "text-destructive",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
    balance: {
      true: "text-balance",
      false: "",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "default",
    align: "left",
    balance: false,
  },
});

function Text({
  className,
  variant,
  tone,
  align,
  balance,
  asChild = false,
  ...props
}: React.ComponentProps<"p"> &
  VariantProps<typeof textVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "p";

  return (
    <Comp
      data-slot="text"
      data-variant={variant}
      data-tone={tone}
      className={cn(textVariants({ variant, tone, align, balance }), className)}
      {...props}
    />
  );
}

export { Text, textVariants };
