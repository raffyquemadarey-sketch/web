import type { ReactNode } from "react";

import { visuallyHiddenStyle } from "./visually-hidden";

export function Table({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <table className="table">
      <caption style={visuallyHiddenStyle}>{caption}</caption>
      {children}
    </table>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th scope="col">{children}</th>;
}

export function Td({ children }: { children: ReactNode }) {
  return <td>{children}</td>;
}

export function Tr({
  striped = false,
  children,
}: {
  striped?: boolean;
  children: ReactNode;
}) {
  return (
    <tr style={striped ? { background: "var(--color-neutral-100)" } : undefined}>
      {children}
    </tr>
  );
}
