"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { FormCard } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { useDemoSession } from "@/lib/demo/demo-session-provider";
import { signInSchema } from "@/lib/validation/schemas";
import type { SignInInput } from "@/lib/validation/schemas";

export function SignInForm() {
  const router = useRouter();
  const { signInDemo } = useDemoSession();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    signInDemo(
      {
        name: values.email.split("@")[0],
        email: values.email,
        role: "player",
        skill: null,
      },
      { isNewAccount: false },
    );
    router.push("/dashboard");
  });

  return (
    <FormCard width={400} onSubmit={onSubmit} noValidate>
      <h2 style={{ fontSize: "28px", margin: "0 0 4px" }}>Welcome back</h2>
      <p style={{ fontSize: "14px", opacity: 0.7, margin: "0 0 24px" }}>
        New to RallyPoint?{" "}
        <Link href="/register" style={{ textDecoration: "underline" }}>
          Register to play
        </Link>
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
        style={{ minHeight: "44px", fontSize: "14px" }}
      >
        Sign in
      </Button>
    </FormCard>
  );
}
