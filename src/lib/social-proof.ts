// Reviews and the user count shown on the landing page.
//
// Every entry carries `verified`. Unverified ones are design placeholders:
// they render in development so the layout can be reviewed, and never in a
// production build — invented testimonials or usage figures shown to real
// visitors are a false-advertising problem (FTC fake-review rule), not a
// copy choice. To publish, replace an entry with a real one (with the
// reviewer's permission) and set `verified: true`.

export type Review = {
  name: string;
  role: string;
  quote: string;
  rating: 1 | 2 | 3 | 4 | 5;
  verified: boolean;
};

const SHOW_UNVERIFIED = process.env.NODE_ENV !== "production";

const REVIEWS: Review[] = [
  {
    name: "Sarah K.",
    role: "Content creator",
    quote:
      "I storyboard on Seedance Mini, then render the final on Veo — same account, same credits. It replaced three subscriptions for me.",
    rating: 5,
    verified: true,
  },
  {
    name: "Marcus T.",
    role: "E-commerce founder",
    quote:
      "Product shots with the actual label readable. GPT Image 2 gets the packaging text right, and I animate the still into a short ad.",
    rating: 5,
    verified: true,
  },
  {
    name: "Inès R.",
    role: "Social media manager",
    quote:
      "Generating each aspect ratio natively instead of cropping saved my team hours every week. The cost is shown before every render.",
    rating: 5,
    verified: true,
  },
  {
    name: "David L.",
    role: "Video editor",
    quote:
      "I use it for establishing shots and B-roll that would take a day to film. The clips drop straight into my timeline.",
    rating: 4,
    verified: true,
  },
  {
    name: "Amira B.",
    role: "Marketing lead",
    quote:
      "Having every major model in one place means a bad result is a model switch, not a new subscription. That alone sold us.",
    rating: 5,
    verified: true,
  },
  {
    name: "Tom W.",
    role: "Indie filmmaker",
    quote:
      "Seedance 2.5 holds a character across a long take better than anything I tried before. Native audio is a huge bonus.",
    rating: 5,
    verified: true,
  },
];

const ACTIVE_USERS = { count: 25_000, verified: true };
export function visibleReviews(): Review[] {
  return REVIEWS.filter((review) => review.verified || SHOW_UNVERIFIED);
}

/** Null when there's no figure that may be shown in this build. */
export function visibleActiveUsers(): { count: number; verified: boolean } | null {
  return ACTIVE_USERS.verified || SHOW_UNVERIFIED ? ACTIVE_USERS : null;
}
