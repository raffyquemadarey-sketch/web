import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { tournamentRouteExists } from "@/lib/data/repository";

import { ConfirmEntry } from "./confirm-entry";

export const metadata: Metadata = {
  title: "Confirm your entry",
  description: "Choose your division and confirm your tournament entry.",
};

export default async function EnterPage(
  props: PageProps<"/tournaments/[id]/enter">,
) {
  const { id } = await props.params;
  if (!(await tournamentRouteExists(id))) notFound();

  return <ConfirmEntry id={id} />;
}
