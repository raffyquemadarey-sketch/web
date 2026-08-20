"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { FormCard } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { createQuickPlaySession } from "@/lib/demo/quick-play";
import { ensureOwner } from "@/lib/quick-play/owner";
import { toQuickPlayRow } from "@/lib/quick-play/session-row";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { quickPlayDraftSchema } from "@/lib/validation/schemas";
import type { QuickPlayDraftInput } from "@/lib/validation/schemas";

/**
 * The only place a quick play comes into existence, and therefore the only
 * place an anonymous identity is minted — see `@/lib/quick-play/owner`. It asks
 * for a title and nothing else: every other Quick Play setting is editable on
 * the session page one click later, and every change there saves itself.
 */
export function CreateQuickPlayForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
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

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);

    if (!getSupabaseEnv()) {
      setFailure(
        "Not created — this site has no Supabase project configured, so there is nowhere to save quick plays. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and reload.",
      );
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const owner = await ensureOwner(supabase);
    if (!owner.ok) {
      setSubmitting(false);
      setFailure(
        owner.reason === "disabled"
          ? "Not created — anonymous sign-in is turned off for this Supabase project. Turn it on under Authentication → Sign In / Providers → Anonymous Sign-Ins, then try again."
          : `Not created — ${owner.message}. Try again.`,
      );
      return;
    }

    // The whole session is serialised rather than relying on column defaults,
    // so the row is readable by `fromQuickPlayRow` the moment it exists.
    // `.select("id")` is the one place the round trip is worth it — the
    // generated uuid is the URL we navigate to.
    const { data, error } = await supabase
      .from("quick_play_sessions")
      .insert(toQuickPlayRow(createQuickPlaySession(values.title), owner.ownerId))
      .select("id")
      .single();

    if (error || !data) {
      setSubmitting(false);
      setFailure(
        `Not created — ${error?.message ?? "the database returned no id"}. Try again.`,
      );
      return;
    }

    // `submitting` stays true through the push, so the button cannot be fired
    // a second time while the next route is loading.
    router.push(`/quick-play/${data.id}`);
  });

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
        disabled={submitting}
        style={{ minHeight: "44px", fontSize: "14px" }}
      >
        {submitting ? "Creating…" : "Create quick play"}
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
