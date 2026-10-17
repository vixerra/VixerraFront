// Real customer testimonials for the homepage. Deliberately empty: the
// section hides itself until there is at least one entry.
//
// TODO(owner): add only testimonials you have permission to publish, from
// real customers, in their own words. Link each one to the output it talks
// about (a /gallery/<id> page) so the claim can be checked.

export type Testimonial = {
  name: string;
  /** Public handle, e.g. "@studio.name". */
  handle?: string;
  /** Square image under public/ or an absolute URL. */
  avatarUrl?: string;
  quote: string;
  /** A page showing the output the quote is about, usually /gallery/<id>. */
  outputHref?: string;
};

export const TESTIMONIALS: Testimonial[] = [];
