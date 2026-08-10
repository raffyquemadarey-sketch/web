import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  block?: boolean;
  /** The design's larger call-to-action size: 44px tall, roomier, 14px text. */
  large?: boolean;
  className?: string;
};

export function buttonClassName({
  variant = "secondary",
  block = false,
  large = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    "btn",
    `btn-${variant}`,
    block && "btn-block",
    large && "min-h-[44px] px-[22px] text-[14px]",
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & ButtonStyleOptions;

export function Button({
  variant,
  block,
  large,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, block, large, className })}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleOptions;

export function ButtonLink({
  variant,
  block,
  large,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ variant, block, large, className })}
      {...props}
    />
  );
}
