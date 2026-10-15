"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { LAUNCH_OFFER } from "@/lib/constants";

type OfferCount = {
  places: number;
  taken: number;
  remaining: number;
  /** Older deployments of the API don't send these three. */
  launch_price?: number;
  list_price?: number;
  /** The UNLIMITED_PROMO_ENABLED kill switch, from the same endpoint. */
  unlimited_promo_enabled?: boolean;
};

/**
 * Live state of Starter's launch offer (see LAUNCH_OFFER), off GET
 * /api/subscription/offer.
 *
 * `taken`/`remaining` stay null until the API has actually answered: the copy
 * then says how many spots the offer has, never a made-up number left. And
 * `soldOut` is only ever true on a real answer — every piece of the offer's
 * marketing disappears once it is, so nothing keeps selling scarcity after
 * the last spot is gone.
 *
 * The numbers are the API's, unaltered: it counts paid Starter invoices in
 * the database. A count padded to look scarcer is false scarcity, an unfair
 * commercial practice in the EU.
 */
export function useLaunchOffer() {
  const { data } = useLaunchOfferQuery();

  return {
    places: data?.places ?? LAUNCH_OFFER.places,
    taken: data ? data.taken : null,
    remaining: data ? Math.max(0, data.remaining) : null,
    soldOut: data ? data.remaining <= 0 : false,
  };
}

/**
 * Whether the 7-day Wan 3.0 Unlimited badges show (the API's
 * UNLIMITED_PROMO_ENABLED kill switch). Shown until the API says otherwise.
 */
export function useUnlimitedPromoEnabled(): boolean {
  const { data } = useLaunchOfferQuery();
  return data?.unlimited_promo_enabled ?? true;
}

function useLaunchOfferQuery() {
  return useQuery({
    queryKey: ["launch-offer"],
    queryFn: async (): Promise<OfferCount> => {
      const res = await apiFetch("/api/subscription/offer");
      if (!res.ok) throw new Error("Launch offer unavailable");
      return res.json();
    },
    staleTime: 30_000,
    // Keeps the counter true while someone sits on the page.
    refetchInterval: 60_000,
    retry: 1,
  });
}
