// Which promo banner the homepage shows. One at a time: the page used to
// stack the Wan 3.0 Unlimited and Seedance banners, plus the launch
// carousel, and three competing offers read as none. Change this value to
// rotate; null shows no banner.
//
// TODO(owner): pick the promo to run. The Kling 4.0 launch is the current
// one (2026-10-25), in place of Wan 3.0 Unlimited.
export const HOME_PROMOS = ["kling4-launch", "wan3-unlimited", "seedance"] as const;
export type HomePromo = (typeof HOME_PROMOS)[number];

export const HOME_PROMO: HomePromo | null = "kling4-launch";
