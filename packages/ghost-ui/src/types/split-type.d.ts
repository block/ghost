declare module "split-type" {
  interface SplitTypeOptions {
    types?: ("lines" | "words" | "chars")[];
  }

  interface SplitTypeResult {
    lines?: HTMLElement[];
    words?: HTMLElement[];
    chars?: HTMLElement[];
    split: (options?: SplitTypeOptions) => SplitTypeResult;
    revert: () => void;
  }

  export default function SplitType(
    element: HTMLElement,
    options?: SplitTypeOptions,
  ): SplitTypeResult;
}
