// Structured data, emitted server-side so crawlers see it in the initial
// HTML. `application/ld+json` is not executable script — React still wants
// dangerouslySetInnerHTML for it, so the payload goes through JSON.stringify
// with `<` escaped, which is the one character that could close the tag early
// if a prompt or model description ever contained markup.

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\u003c"),
      }}
    />
  );
}
