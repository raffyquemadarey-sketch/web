import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuickPlaySyncProvider } from "@/lib/quick-play/sync-provider";

import { QuickPlaySession } from "./quick-play-session";

/** Static, not `generateMetadata`: a quick play's title is public and could go
 *  in the <title>, but fetching it would turn a client-rendered page into a
 *  per-request server fetch. That is a separate change. */
export const metadata: Metadata = {
  title: "Quick Play session",
  description:
    "Add players, split them into teams and draw the bracket for tonight's session.",
};

/** Anything that is not a uuid can never name a row, so it is a real 404. A
 *  well-formed uuid is looked up in the browser, where a row that is not there
 *  becomes the "we couldn't open that quick play" panel. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function QuickPlaySessionPage(
  props: PageProps<"/quick-play/[id]">,
) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();

  // `key` is load-bearing: navigating between two quick plays reuses this route
  // segment, so without it the provider would keep the previous session's refs
  // and its mount-only effects would never re-run.
  return (
    <QuickPlaySyncProvider key={id} sessionId={id}>
      <QuickPlaySession sessionId={id} />
    </QuickPlaySyncProvider>
  );
}
