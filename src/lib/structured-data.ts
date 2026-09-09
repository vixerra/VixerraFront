// Site-wide Schema.org payloads.
//
// Prices and plan names come from TIER_INFO rather than being written out
// here — structured data that disagrees with the visible pricing table is
// exactly what Google penalises, and this app has already been bitten once by
// plan labels living in two places (see the note above FAQS in pricing/page).

import { TIERS, TIER_INFO } from "@/lib/constants";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const PLAN_OFFERS = TIERS.map((tier) => {
  const info = TIER_INFO[tier];
  return {
    "@type": "Offer",
    name: `${info.label} plan`,
    price: info.priceMonthly.toFixed(2),
    priceCurrency: "USD",
    category: info.priceMonthly === 0 ? "free" : "subscription",
    url: absoluteUrl("/pricing"),
    ...(info.priceMonthly > 0
      ? {
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: info.priceMonthly.toFixed(2),
            priceCurrency: "USD",
            billingDuration: 1,
            billingIncrement: 1,
            unitCode: "MON",
          },
        }
      : {}),
  };
});

const PRICES = TIERS.map((tier) => TIER_INFO[tier].priceMonthly);

export const aggregateOffer = {
  "@type": "AggregateOffer",
  priceCurrency: "USD",
  lowPrice: Math.min(...PRICES).toFixed(2),
  highPrice: Math.max(...PRICES).toFixed(2),
  offerCount: PLAN_OFFERS.length,
  offers: PLAN_OFFERS,
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#app`,
  name: SITE_NAME,
  applicationCategory: "MultimediaApplication",
  applicationSubCategory: "AI video and image generation",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: { "@id": `${SITE_URL}/#organization` },
  offers: aggregateOffer,
  featureList: [
    "Text to video generation",
    "Image to video generation",
    "Text to image generation",
    "Native audio generated with video",
    "Reference-image control",
    "Marketing studio for ad creative",
    "Editing studio with captions, music and MP4 export",
    "Publishing to TikTok, Instagram, YouTube and Facebook",
  ],
};

/** Schema.org Product for the pricing page, one Offer per plan. */
export const pricingProductJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${SITE_NAME} plans`,
  description: `Credit-based plans for AI video and image generation on ${SITE_NAME}.`,
  url: absoluteUrl("/pricing"),
  brand: { "@type": "Brand", name: SITE_NAME },
  offers: aggregateOffer,
};
