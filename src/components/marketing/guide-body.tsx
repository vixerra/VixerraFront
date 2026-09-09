import Link from "next/link";
import type { ReactNode } from "react";
import type { GuideBlock } from "@/lib/guides";

// Renders a guide's block list.
//
// Inline markup is a deliberately tiny subset of markdown — [label](/href),
// **bold** and *italic* — parsed into real elements rather than passed through
// dangerouslySetInnerHTML. The content is ours either way, but parsing keeps
// internal links as <Link> (client-side navigation, and one place to change
// how they look) instead of raw anchors.
//
// The bold alternative must precede the italic one: JS alternation is
// leftmost-first at each position, so with the order reversed a "**" would
// match as an italic containing nothing and the asterisks would survive into
// the rendered page.

const INLINE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const [full, linkLabel, href, bold, italic] = match;
    if (linkLabel && href) {
      nodes.push(
        href.startsWith("/") ? (
          <Link
            key={key++}
            href={href}
            className="text-brand underline underline-offset-4 hover:text-ink"
          >
            {linkLabel}
          </Link>
        ) : (
          <a
            key={key++}
            href={href}
            rel="noopener noreferrer"
            className="text-brand underline underline-offset-4 hover:text-ink"
          >
            {linkLabel}
          </a>
        ),
      );
    } else if (bold) {
      nodes.push(
        <strong key={key++} className="font-semibold text-ink">
          {bold}
        </strong>,
      );
    } else if (italic) {
      nodes.push(<em key={key++}>{italic}</em>);
    }
    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="mt-10 space-y-6">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={index}
                className="pt-6 text-feature-title font-bold text-ink sm:text-heading"
              >
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} className="pt-2 text-feature-title font-semibold text-ink">
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={index} className="space-y-2 pl-5">
                {block.items.map((item, i) => (
                  <li key={i} className="list-disc text-body text-ink-soft marker:text-brand">
                    {inline(item)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="space-y-2 pl-5">
                {block.items.map((item, i) => (
                  <li key={i} className="list-decimal text-body text-ink-soft marker:text-muted">
                    {inline(item)}
                  </li>
                ))}
              </ol>
            );
          case "note":
            return (
              <aside
                key={index}
                className="rounded-2xl border border-line bg-surface-2 p-5 text-body-sm text-muted"
              >
                {inline(block.text)}
              </aside>
            );
          default:
            return (
              <p key={index} className="text-body text-ink-soft">
                {inline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
