import { cn } from "@ghost/ui";
import { ArrowUpRight } from "lucide-react";
import { ComponentProps } from "react";

interface ExternalLinkProps extends ComponentProps<"a"> {
  showIcon?: boolean;
}

export function ExternalLink({
  href,
  className,
  children,
  title,
  showIcon,
  ...rest
}: ExternalLinkProps) {
  if (!children) return null;

  return (
    <a
      title={title}
      href={href}
      className={cn(
        "group/link inline-flex w-fit items-center justify-between",
        className,
      )}
      rel="noopener noreferrer"
      target="_blank"
      {...rest}
    >
      <span className="group-hover/link:underline">{children}</span>
      {showIcon && (
        <ArrowUpRight
          size={12}
          className="transition group-hover/link:rotate-45"
        />
      )}
    </a>
  );
}
