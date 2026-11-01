import { serializeJsonLd } from "@/lib/json-ld";

// Structured data, emitted server-side so crawlers see it in the initial
// HTML. `application/ld+json` is not executable script — React still wants
// dangerouslySetInnerHTML for it, so the payload goes through serializeJsonLd,
// which escapes everything that could close the tag early: a prompt or an
// author name is user input, and lands here on public gallery pages.

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
    />
  );
}
