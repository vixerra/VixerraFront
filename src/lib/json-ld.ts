const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/** JSON.stringify for an inline `<script type="application/ld+json">`, with
 *  `<`, `>`, `&` and the two JS line separators written as \u escapes. They
 *  are still the same characters to a JSON parser, but `</script>` can no
 *  longer appear in the HTML. The escapes are written with a doubled
 *  backslash on purpose: "<" in source is just `<` again, which is how
 *  this used to be a no-op. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LINE_SEPARATOR)
    .join("\\u2028")
    .split(PARAGRAPH_SEPARATOR)
    .join("\\u2029");
}
