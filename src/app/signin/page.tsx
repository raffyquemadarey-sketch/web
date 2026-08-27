import type { Metadata } from "next";

import { SignInForm } from "@/components/forms/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Club admins sign in here to create and run quick plays.",
};

export default function SignInPage() {
  return <SignInForm />;
}
