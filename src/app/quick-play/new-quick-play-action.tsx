"use client";

import { ButtonLink } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth/viewer";
import { useViewer } from "@/lib/auth/viewer-provider";

/** The header's one control, split out because `page.tsx` is a Server Component
 *  and the role is only known in the browser. Hiding it is cosmetic —
 *  `/quick-play/new` explains itself to anyone who reaches it by URL, and the
 *  insert policy is what actually refuses the insert. */
export function NewQuickPlayAction() {
  const viewer = useViewer();
  if (!isAdmin(viewer)) return null;

  return (
    <ButtonLink href="/quick-play/new" variant="primary" large>
      New quick play
    </ButtonLink>
  );
}
