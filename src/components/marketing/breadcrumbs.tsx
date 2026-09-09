import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/seo";

export type Crumb = { label: string; href?: string };

/**
 * Visible breadcrumb trail plus the matching BreadcrumbList JSON-LD, emitted
 * together so the two can never disagree — Google treats structured data that
 * describes navigation the page doesn't actually show as a markup violation.
 *
 * The last crumb is the current page and is deliberately not a link.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            ...(item.href ? { item: absoluteUrl(item.href) } : {}),
          })),
        }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-caption text-muted">
          {items.map((item, index) => (
            <li key={item.label} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
              {item.href ? (
                <Link href={item.href} className="transition-colors hover:text-brand">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink-soft">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
