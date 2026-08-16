import { CalloutPanel } from "@/components/ui/callout-panel";
import { googleMapsSearchUrl } from "@/lib/tournament/maps";

/** The venue block on a tournament page: the location, plus a link out to it on
 *  Google Maps. A plain `<a>`, not `next/link` — the target is off-site — and no
 *  embedded map, because every keyless embed is either undocumented or needs a
 *  geocoder. With the link absent the venue name still reads fine. */
export function LocationPanel({ location }: { location: string }) {
  const venue = location.trim();
  if (!venue) return null;

  const mapUrl = googleMapsSearchUrl(venue);

  return (
    <CalloutPanel
      size="sm"
      style={{
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "var(--color-accent-700)",
        }}
      >
        Venue
      </span>
      <span style={{ fontSize: "15px" }}>{venue}</span>
      {mapUrl ? (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer noopener"
          style={{ fontSize: "13.5px", textDecoration: "underline" }}
        >
          View on Google Maps →
        </a>
      ) : null}
    </CalloutPanel>
  );
}
