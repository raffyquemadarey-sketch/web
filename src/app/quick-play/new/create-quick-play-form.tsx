"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { useForm } from "react-hook-form";

import { Button, ButtonLink } from "@/components/ui/button";
import { CalloutPanel } from "@/components/ui/callout-panel";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { FormCard } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { Tag } from "@/components/ui/tag";
import { describeViewerError, isAdmin } from "@/lib/auth/viewer";
import { useViewer } from "@/lib/auth/viewer-provider";
import { createQuickPlaySession } from "@/lib/demo/quick-play";
import { toQuickPlayRow } from "@/lib/quick-play/session-row";
import { createClient } from "@/lib/supabase/client";
import { quickPlayDraftSchema } from "@/lib/validation/schemas";
import type { QuickPlayDraftInput } from "@/lib/validation/schemas";

/* The three panels below differ in what they say and in nothing else. */
const EXPLANATION: CSSProperties = {
  fontSize: "14.5px",
  lineHeight: 1.6,
  opacity: 0.78,
  margin: "0 0 20px",
  maxWidth: "60ch",
};

/**
 * The only place a quick play comes into existence. It asks for a title and
 * nothing else: every other Quick Play setting is editable on the session page
 * one click later, and every change there saves itself.
 *
 * Admin-gated twice over — the form is not rendered for anyone else, and the
 * insert policy on `quick_play_sessions` refuses the insert regardless. Only
 * the second one is the control.
 */
export function CreateQuickPlayForm() {
  const router = useRouter();
  const viewer = useViewer();
  const [submitting, setSubmitting] = useState(false);
  /** The navigation, not the insert — see the push at the end of `onSubmit`. */
  const [navigating, startNavigating] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuickPlayDraftInput>({
    resolver: zodResolver(quickPlayDraftSchema),
    mode: "onBlur",
    defaultValues: { title: "" },
  });

  // No `getSupabaseEnv()` guard here: an unconfigured project resolves the
  // viewer to `unconfigured`, and the panel below returns before this form ever
  // mounts. The check that used to live here could not fire.
  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    setSubmitting(true);

    // The whole session is serialised rather than relying on column defaults,
    // so the row is readable by `fromQuickPlayRow` the moment it exists.
    // `.select("id")` is the one place the round trip is worth it — the
    // generated uuid is the URL we navigate to.
    const { data, error } = await createClient()
      .from("quick_play_sessions")
      .insert(toQuickPlayRow(createQuickPlaySession(values.title)))
      .select("id")
      .single();

    if (error || !data) {
      setSubmitting(false);
      setFailure(
        `Not created — ${error?.message ?? "the database returned no id"}. Try again.`,
      );
      return;
    }

    // The button stays disabled while the next route loads, but through the
    // transition rather than through `submitting`: React clears `navigating`
    // when the navigation finishes *or* is interrupted, so a push the user
    // walks away from cannot leave the button stuck on "Creating…" forever.
    setSubmitting(false);
    startNavigating(() => router.push(`/quick-play/${data.id}`));
  });

  // Nothing at all until the viewer resolves, so the server HTML and the first
  // client render agree and no "you can't do this" flashes at an admin
  // mid-page-load.
  if (viewer.kind === "loading") return null;

  // Before the admin gate, because "you're not an admin" would be the wrong
  // answer: there is no auth to be an admin of. This page is where an
  // unconfigured project gets explained — `/signin` and `/quick-play` both say
  // the same thing in their own words, and all three must agree.
  if (viewer.kind === "unconfigured") {
    return (
      <CalloutPanel size="lg" style={{ maxWidth: "560px", margin: "0 auto" }}>
        <Tag tone="accent-2" size="md">
          Not configured
        </Tag>
        <h2 style={{ fontSize: "24px", margin: "12px 0 6px" }}>
          There is nowhere to save a quick play
        </h2>
        <p style={EXPLANATION}>
          This site has no Supabase project configured, so quick plays cannot be
          created, saved or listed. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and reload.
        </p>
        <ButtonLink href="/quick-play" variant="secondary">
          Back to Quick Play
        </ButtonLink>
      </CalloutPanel>
    );
  }

  // The role read failed, so whether this viewer is an admin is unknown. Saying
  // "admins only" here would be asserting something the app does not know.
  if (viewer.kind === "error") {
    return (
      <CalloutPanel size="lg" style={{ maxWidth: "560px", margin: "0 auto" }}>
        <Tag tone="accent-2" size="md">
          Account unavailable
        </Tag>
        <h2 style={{ fontSize: "24px", margin: "12px 0 6px" }}>
          We couldn&apos;t check your account
        </h2>
        <p role="alert" style={EXPLANATION}>
          {describeViewerError(viewer.message)}
        </p>
        <ButtonLink href="/quick-play" variant="secondary">
          Back to Quick Play
        </ButtonLink>
      </CalloutPanel>
    );
  }

  // Not a 404 — the route exists, and pretending otherwise would be a lie. Not
  // a redirect either: the reason is the whole point of arriving here.
  if (!isAdmin(viewer)) {
    return (
      <CalloutPanel size="lg" style={{ maxWidth: "560px", margin: "0 auto" }}>
        <Tag tone="accent-2" size="md">
          Admins only
        </Tag>
        <h2 style={{ fontSize: "24px", margin: "12px 0 6px" }}>
          Only club admins can create a quick play
        </h2>
        <p style={EXPLANATION}>
          Quick plays are run by the club. Anyone can open one and follow the
          teams and the bracket, but creating and editing them is limited to
          admins. If you&apos;re an admin, sign in and try again.
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {viewer.kind === "signed-out" ? (
            <ButtonLink href="/signin" variant="primary">
              Sign in
            </ButtonLink>
          ) : null}
          <ButtonLink href="/quick-play" variant="secondary">
            Back to Quick Play
          </ButtonLink>
        </div>
      </CalloutPanel>
    );
  }

  return (
    <FormCard width={440} onSubmit={onSubmit} noValidate>
      <Link
        href="/quick-play"
        style={{
          fontSize: "13px",
          textDecoration: "underline",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        ← Quick Play
      </Link>
      <h2 style={{ fontSize: "26px", margin: "0 0 20px" }}>New quick play</h2>

      <Field
        error={errors.title?.message}
        hint="You'll see this in your list of quick plays."
        className="mb-[14px]"
      >
        <FieldLabel>Title</FieldLabel>
        <Input type="text" placeholder="Tuesday club night" {...register("title")} />
        <FieldError />
        <FieldHint />
      </Field>

      <p
        style={{
          fontSize: "12.5px",
          lineHeight: 1.6,
          opacity: 0.7,
          margin: "0 0 22px",
        }}
      >
        Format, teams, courts and match length are all set on the session page,
        and every change saves itself.
      </p>

      <Button
        type="submit"
        variant="primary"
        block
        disabled={submitting || navigating}
        style={{ minHeight: "44px", fontSize: "14px" }}
      >
        {submitting || navigating ? "Creating…" : "Create quick play"}
      </Button>

      {failure ? (
        <p
          role="alert"
          style={{
            fontSize: "12.5px",
            lineHeight: 1.6,
            margin: "12px 0 0",
            color: "var(--color-accent-800)",
          }}
        >
          {failure}
        </p>
      ) : null}
    </FormCard>
  );
}
