import type { Metadata } from "next";

import { CreateQuickPlayForm } from "./create-quick-play-form";

export const metadata: Metadata = {
  title: "New quick play",
  description: "Give tonight's session a title and start adding players.",
};

export default function NewQuickPlayPage() {
  return <CreateQuickPlayForm />;
}
