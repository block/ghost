import { useState } from "react";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLanguageSelector,
  CodeBlockLanguageSelectorContent,
  CodeBlockLanguageSelectorItem,
  CodeBlockLanguageSelectorTrigger,
  CodeBlockLanguageSelectorValue,
} from "@/components/ai-elements/code-block";

const snippets: Record<string, { code: string; language: "typescript" | "python" | "rust" }> = {
  typescript: {
    code: `function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55`,
    language: "typescript",
  },
  python: {
    code: `def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(10))  # 55`,
    language: "python",
  },
  rust: {
    code: `fn fibonacci(n: u32) -> u32 {
    if n <= 1 {
        return n;
    }
    fibonacci(n - 1) + fibonacci(n - 2)
}

fn main() {
    println!("{}", fibonacci(10)); // 55
}`,
    language: "rust",
  },
};

export default function CodeBlockWithDiff() {
  const [lang, setLang] = useState("typescript");
  const snippet = snippets[lang];

  return (
    <div className="w-full max-w-xl">
      <CodeBlock code={snippet.code} language={snippet.language} showLineNumbers>
        <CodeBlockHeader>
          <CodeBlockLanguageSelector value={lang} onValueChange={setLang}>
            <CodeBlockLanguageSelectorTrigger>
              <CodeBlockLanguageSelectorValue />
            </CodeBlockLanguageSelectorTrigger>
            <CodeBlockLanguageSelectorContent>
              <CodeBlockLanguageSelectorItem value="typescript">
                TypeScript
              </CodeBlockLanguageSelectorItem>
              <CodeBlockLanguageSelectorItem value="python">
                Python
              </CodeBlockLanguageSelectorItem>
              <CodeBlockLanguageSelectorItem value="rust">
                Rust
              </CodeBlockLanguageSelectorItem>
            </CodeBlockLanguageSelectorContent>
          </CodeBlockLanguageSelector>
          <CodeBlockActions>
            <CodeBlockCopyButton />
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlock>
    </div>
  );
}
