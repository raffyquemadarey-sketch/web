/* Google's Maps URLs API: documented, keyless, unbilled, and it opens a real map
   with directions in whatever maps app the visitor has.

   Deliberately not the Maps Embed API, which would need a billing-enabled key to
   render an `<iframe>`, and deliberately not the legacy `maps.google.com/maps?
   …&output=embed` endpoint, which is undocumented and can go dark without notice. */

const MAPS_SEARCH_BASE = "https://www.google.com/maps/search/?api=1&query=";

/** A "View on Google Maps" href for a free-text venue, or `null` if there is no
 *  venue to look up yet. */
export function googleMapsSearchUrl(location: string): string | null {
  const query = location.trim();
  if (!query) return null;
  return `${MAPS_SEARCH_BASE}${encodeURIComponent(query)}`;
}
