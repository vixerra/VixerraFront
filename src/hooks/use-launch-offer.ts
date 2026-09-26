"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { LAUNCH_OFFER } from "@/lib/constants";

type OfferCount = { places: number; taken: number; remaining: number };

/**
 * Live state of Starter's launch offer (see LAUNCH_OFFER), off GET
 * /api/subscription/offer.
 *
 * `taken`/`remaining` stay null until the API has actually answered: the copy
 * then says how many spots the offer has, never a made-up number left. And
 * `soldOut` is only ever true on a real answer — every piece of the offer's
 * marketing disappears once it is, so nothing keeps selling scarcity after
 * the last spot is gone.
 */
export function useLaunchOffer() {
  const { data } = useQuery({
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

  return {
    places: data?.places ?? LAUNCH_OFFER.places,
    taken: data ? data.taken : null,
    remaining: data ? data.remaining : null,
    soldOut: data ? data.remaining <= 0 : false,
  };
}
