import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface SectionWrapperProps extends ComponentProps<"div"> {
  withCane?: boolean;
}

function SectionWrapper({
  children,
  className,
  withCane = false,
  ...props
}: SectionWrapperProps) {
  if (withCane) {
    return (
      <div
        className={cn(
          "relative isolate my-6 md:my-8 lg:my-10 px-6 lg:px-8",
          className,
        )}
        {...props}
      >
        {children}
        <div className="inset-x-0 top-0 hidden h-10 -translate-y-full border-y bg-[image:repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed xl:absolute xl:block" />
        <div className="inset-x-0 bottom-0 hidden h-10 translate-y-full border-y bg-[image:repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed xl:absolute xl:block" />
      </div>
    );
  }

  return (
    <div
      className={cn("relative py-6 md:py-8 px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface ContainerWrapperProps extends ComponentProps<"div"> {
  withCane?: boolean;
  inverse?: boolean;
}

function ContainerWrapper({
  children,
  className,
  withCane = false,
  inverse = false,
  ...props
}: ContainerWrapperProps) {
  if (withCane) {
    return (
      <div
        className={cn(
          "relative mx-auto w-full max-w-[96rem]",
          inverse
            ? "bg-background-app-inverse text-text-prominent-inverse"
            : "",
          className,
        )}
        {...props}
      >
        {children}
        <div
          className={`inset-y-0 left-0 hidden -translate-x-full xl:absolute xl:block ${
            inverse ? "bg-background-app-inverse" : "border-r"
          }`}
        />
        <div
          className={`inset-y-0 right-0 hidden translate-x-full xl:absolute xl:block ${
            inverse ? "bg-background-app-inverse" : "border-l"
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[96rem] px-6 lg:px-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ContainerWrapper, SectionWrapper };
