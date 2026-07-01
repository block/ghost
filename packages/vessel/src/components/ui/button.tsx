import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border border-input bg-background hover:bg-muted",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        ghost: "hover:bg-muted dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9",
        sm: "h-8 gap-1.5",
        lg: "h-10",
        icon: "w-9 h-9 p-0",
        "icon-xs": "w-7 h-7 p-0",
        "icon-sm": "w-8 h-8 p-0",
      },
      appearance: {
        default: "",
        icon: "",
      },
    },
    compoundVariants: [
      {
        appearance: "default",
        size: "default",
        className: "px-6 py-2 has-[>svg]:px-4",
      },
      {
        appearance: "default",
        size: "sm",
        className: "px-4 has-[>svg]:px-3",
      },
      {
        appearance: "default",
        size: "lg",
        className: "px-8 has-[>svg]:px-6",
      },
      {
        appearance: "icon",
        size: "default",
        className: "w-9 h-9 p-0",
      },
      {
        appearance: "icon",
        size: "sm",
        className: "w-8 h-8 p-0",
      },
      {
        appearance: "icon",
        size: "lg",
        className: "w-10 h-10 p-0",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      appearance: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  appearance = "default",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    appearance?: "default" | "icon";
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, appearance, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
