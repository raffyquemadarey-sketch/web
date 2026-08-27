"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { FormCard } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { describeSignInError } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { signInSchema } from "@/lib/validation/schemas";
import type { SignInInput } from "@/lib/validation/schemas";

/**
 * Real Supabase email/password sign-in — the one authenticated thing on the
 * site. It exists so club admins can create and run quick plays; nothing else
 * checks it. `/register` still fabricates a demo profile and cannot produce an
 * account this form accepts, which is why the sub-line says so and no longer
 * links there.
 */
export function SignInForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  /** The navigation, not the sign-in — see the push at the end of `onSubmit`. */
  const [navigating, startNavigating] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);

    if (!getSupabaseEnv()) {
      setFailure(
        "Sign-in is unavailable — this site has no Supabase project configured.",
      );
      return;
    }

    setSubmitting(true);

    const { error } = await createClient().auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setSubmitting(false);
      setFailure(describeSignInError(error.code, error.message));
      return;
    }

    // The button stays disabled while the next route loads, but through the
    // transition rather than through `submitting`: React clears `navigating`
    // when the navigation finishes *or* is interrupted, so a push the user
    // walks away from cannot leave the button stuck on "Signing in…" forever.
    setSubmitting(false);
    startNavigating(() => router.push("/quick-play"));
  });

  return (
    <FormCard width={400} onSubmit={onSubmit} noValidate>
      <h2 style={{ fontSize: "28px", margin: "0 0 4px" }}>Welcome back</h2>
      <p
        style={{
          fontSize: "14px",
          lineHeight: 1.6,
          opacity: 0.7,
          margin: "0 0 24px",
        }}
      >
        Signing in here is real. It&apos;s how club admins get access to create
        and run quick plays — the rest of this site is still a demo.
      </p>

      <Field error={errors.email?.message} className="mb-[14px]">
        <FieldLabel>Email</FieldLabel>
        <Input type="email" placeholder="you@example.com" {...register("email")} />
        <FieldError />
      </Field>
      <Field error={errors.password?.message} className="mb-[20px]">
        <FieldLabel>Password</FieldLabel>
        <Input
          type="password"
          placeholder="Your password"
          {...register("password")}
        />
        <FieldError />
      </Field>

      <Button
        type="submit"
        variant="primary"
        block
        disabled={submitting || navigating}
        style={{ minHeight: "44px", fontSize: "14px" }}
      >
        {submitting || navigating ? "Signing in…" : "Sign in"}
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
