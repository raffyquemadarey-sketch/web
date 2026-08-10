import type { Metadata } from "next";

import { SignInForm } from "@/components/forms/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to see your entries and draws.",
};

export default function SignInPage() {
  return <SignInForm />;
}
