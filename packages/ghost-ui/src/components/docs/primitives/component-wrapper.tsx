// pulled from https://github.com/shadcn-ui/ui/blob/main/apps/v4/components/component-wrapper.tsx#L7
"use client";

import { Check, Clipboard, Expand, Globe, Hash, Terminal } from "lucide-react";
import * as React from "react";
import { ComponentErrorBoundary } from "@/components/docs/error-boundary";
import { ExternalLink } from "@/components/docs/external-link";
import { TooltipWrapper } from "@/components/docs/tooltip-wrapper";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn, getComponentName } from "@/lib/utils";

export function ComponentWrapper({
  className,
  name,
  children,
  internalUrl,
  showUrl = false,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  name: string;
  internalUrl?: string;
  showUrl?: boolean;
}) {
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const [isHashCopied, setIsHashCopied] = React.useState(false);

  const handleHashCopy = () => {
    const url = `${window.location.origin}${
      window.location.pathname
    }#${name.toLowerCase()}`;
    copyToClipboard(url);
    setIsHashCopied(true);
    setTimeout(() => setIsHashCopied(false), 2000);
  };

  React.useEffect(() => {
    // Enable smooth scrolling for anchor links
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <ComponentErrorBoundary name={name}>
      <div
        id={`component-${name.toLowerCase()}`}
        data-name={name.toLowerCase()}
        className={cn(
          "@container flex w-full scroll-mt-16 flex-col pb-12 relative",
          className,
        )}
        {...props}
      >
        <div className="z-10 absolute bottom-0 left-0 w-full h-[1px] bg-border" />

        <div className="py-3">
          <div className="flex flex-col items-center justify-between gap-2 text-xs lg:text-sm @lg:flex-row">
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 font-display font-bold tracking-[-0.02em]"
                style={{ fontSize: "var(--heading-sub-font-size)" }}
              >
                {getComponentName(name)}
              </span>
              <TooltipWrapper label="Copy primitive link" asChild>
                <Button
                  appearance="icon"
                  variant="outline"
                  className="relative size-8 cursor-pointer p-1 mt-1"
                  onClick={handleHashCopy}
                >
                  <Hash
                    className={cn(
                      "absolute size-4 transition duration-200",
                      isHashCopied ? "scale-0" : "scale-100",
                    )}
                  />
                  <Check
                    className={cn(
                      "absolute size-4 transition duration-200",
                      !isHashCopied ? "scale-0" : "scale-100",
                    )}
                  />
                </Button>
              </TooltipWrapper>
            </div>

            {/* <Alert className="border-primary/30 bg-primary/10 flex w-full items-center border px-4 py-1 @lg:max-w-1/3">
              <div className="pr-2">
                <Terminal className="size-4" />
              </div>

              <AlertTitle className="w-full font-mono text-xs text-pretty">
                {`npx shadcn@latest add `}
                <span>{name}</span>
              </AlertTitle>

              <div className="ml-auto flex items-center">
                <TooltipWrapper label="Copy command" asChild>
                  <Button
                    style={"icon"}
                    variant={"ghost"}
                    className="relative size-4 cursor-pointer p-1"
                    onClick={() =>
                      copyToClipboard(`npx shadcn@latest add ${name}`)
                    }
                  >
                    <Clipboard
                      className={cn(
                        "absolute size-4 transition duration-200",
                        isCopied ? "scale-0" : "scale-100"
                      )}
                    />
                    <Check
                      className={cn(
                        "absolute size-4 transition duration-200",
                        !isCopied ? "scale-0" : "scale-100"
                      )}
                    />
                  </Button>
                </TooltipWrapper>

                {showUrl && (
                  <TooltipWrapper label="Shadcn docs" asChild>
                    <ExternalLink
                      href={
                        internalUrl
                          ? `${baseUrl}${internalUrl}`
                          : `https://ui.shadcn.com/docs/components/${name}`
                      }
                      showIcon
                      className="size-fit cursor-pointer p-1"
                    >
                      {internalUrl ? (
                        <Expand className="size-4" />
                      ) : (
                        <Globe className="size-4" />
                      )}
                    </ExternalLink>
                  </TooltipWrapper>
                )}
              </div>
            </Alert> */}
          </div>
        </div>
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-start gap-8 py-4 @5xl:flex-row @5xl:items-start",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </ComponentErrorBoundary>
  );
}
