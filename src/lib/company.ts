// Facts about the company behind Vixlens, for /about, /contact and the
// refund policy. Every field that isn't known yet is null: the pages render a
// visible placeholder in development and leave the line out in production,
// so nothing invented ever reaches the public site.

export const COMPANY = {
  /** TODO(owner): registered legal name of the company that operates Vixlens. */
  legalName: null as string | null,
  /** TODO(owner): city and country of the registered office. */
  location: null as string | null,
  /** TODO(owner): a monitored support address, e.g. support@vixlens.com. */
  supportEmail: null as string | null,
  /** Already promised on /contact before this file existed. */
  responseTime: "within a day",
  /** TODO(owner): two or three paragraphs — why Vixlens exists, who it's for. */
  story: null as string[] | null,
  /** TODO(owner): the people behind Vixlens — name, role, optional link. */
  team: [] as { name: string; role: string; href?: string }[],
  /** TODO(owner): public status page URL, if there is one. */
  statusPageUrl: null as string | null,
};

/** Whether unfilled company facts render as a visible placeholder. */
export const SHOW_COMPANY_PLACEHOLDERS = process.env.NODE_ENV !== "production";
