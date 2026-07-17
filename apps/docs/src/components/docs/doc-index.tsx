import type { ReactNode } from "react";
import { Link } from "react-router";

export interface DocIndexItem {
  name: string;
  href: string;
  description: string;
}

export function DocIndex({
  items,
  startAt = 1,
  className = "",
}: {
  items: DocIndexItem[];
  startAt?: number;
  className?: string;
}) {
  return (
    <nav className={`doc-index ${className}`} aria-label="page index">
      {items.map((item, index) => (
        <Link className="doc-index-row" key={item.href} to={item.href}>
          <span className="doc-index-id">
            <span className="doc-index-number">{startAt + index} </span>
            {item.name.toLowerCase()}
          </span>
          <span className="doc-index-description">{item.description}</span>
        </Link>
      ))}
    </nav>
  );
}

export function InlineIndex({
  items,
}: {
  items: { label: string; href: string; prefix?: ReactNode }[];
}) {
  return (
    <nav
      className="mt-8 flex max-w-[76ch] flex-wrap gap-x-[4ch] gap-y-1"
      aria-label="contents"
    >
      {items.map((item, index) => (
        <Link
          className="doc-link whitespace-nowrap"
          key={item.href}
          to={item.href}
        >
          <span className="doc-annotation">{item.prefix ?? index + 1} </span>
          {item.label.toLowerCase()}
        </Link>
      ))}
    </nav>
  );
}
