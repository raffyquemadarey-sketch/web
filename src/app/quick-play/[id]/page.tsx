import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuickPlaySyncProvider } from "@/lib/quick-play/sync-provider";

import { QuickPlaySession } from "./quick-play-session";

/** Static, not `generateMetadata`: the title of a quick play is private to the
 *  browser that made it, and the server has no business reading it to fill in
 *  a <title>. */
export const metadata: Metadata = {
  title: "Quick Play session",
  description:
    "Add players, split them into teams and draw the bracket for tonight's session.",
};

/** Anything that is not a uuid can never name a row, so it is a real 404 and
 *  saying so leaks nothing. A well-formed uuid is checked in the browser, under
 *  RLS, where "does not exist" and "belongs to someone else" are one answer. */
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
