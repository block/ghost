import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Expression } from "@ghost/core";
import { EXPRESSION_FILENAME, serializeExpression } from "ghost-expression";

/**
 * Write an expression as a publishable artifact (expression.md) to the
 * project root. Other projects can track this file as a reference.
 */
export async function emitExpression(
  expression: Expression,
  cwd: string = process.cwd(),
): Promise<string> {
  const target = resolve(cwd, EXPRESSION_FILENAME);
  await writeFile(target, serializeExpression(expression), "utf-8");

  return target;
}
