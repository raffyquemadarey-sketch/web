import type { Metadata } from "next";

import { QuickPlaySession } from "./quick-play-session";

export const metadata: Metadata = {
  title: "Quick Play",
  description: "Add players by hand and draw a bracket for tonight's session.",
};

export default function QuickPlayPage() {
  return <QuickPlaySession />;
}
