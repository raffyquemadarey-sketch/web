"use client";

import { useEffect, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { CalloutPanel } from "@/components/ui/callout-panel";
import { Card, CardKicker, CardTitle } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { messageOf } from "@/lib/quick-play/owner";
import {
  QUICK_PLAY_LIST_COLUMNS,
  toQuickPlaySummary,
} from "@/lib/quick-play/session-list";
import type { QuickPlaySummary } from "@/lib/quick-play/session-list";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { formatLabel } from "@/lib/tournament/labels";

/** How long a card's delete stays armed before it forgets it was asked. */
const CONFIRM_MS = 5000;

/* The landing page's feature copy, unchanged: it explained what Quick Play is
   to someone who had never opened it, which is exactly who sees the empty
   state. */
const FEATURES = [
  {
    title: "Add players your way",
    body: "Type names in one at a time, or import the club's spreadsheet. .xlsx and .csv both work, and duplicates are filtered out.",
  },
  {
    title: "Even teams, fast",
    body: "Shuffle the whole roster into teams in one go, or spin the wheel and draw players out one at a time.",
  },
  {
    title: "Pick your format",
    body: "Single elimination, double elimination or round robin. Click a team to record the winner and the bracket fills in.",
  },
  {
    title: "Fits the courts and the clock",
    body: "Set your courts, match length and how long you've got, and Quick Play tells you whether the night fits.",
  },
];

type ListState =
  | { kind: "loading" }
  | { kind: "off" }
  | { kind: "error"; message: string }
  | { kind: "ready"; rows: QuickPlaySummary[] };

/* Only ever runs after the fetch has resolved, never during SSR, so a
   locale-dependent string cannot reach the server HTML and cause a hydration
   mismatch. */
function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function QuickPlayList() {
  // `loading` first, so the server HTML and the first client render agree.
  const [state, setState] = useState<ListState>({ kind: "loading" });
  /** One armed id for the whole list, so only one card can be armed at a time. */
  const [armedId, setArmedId] = useState<string | null>(null);

  useEffect(() => {
    if (!armedId) return;
    const timer = setTimeout(() => setArmedId(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [armedId]);

  useEffect(() => {
    let cancelled = false;

    // Same shape as the sync provider's load, and for the same reason: an
    // effect body may not set state synchronously, and this is a report on an
    // external system rather than derived state.
    const load = async () => {
      if (!getSupabaseEnv()) {
        setState({ kind: "off" });
        return;
      }

      const supabase = createClient();
      const claims = await supabase.auth.getClaims();
      if (cancelled) return;

      if (claims.error) {
        setState({ kind: "error", message: claims.error.message });
        return;
      }

      // No identity means no quick plays — and asking mints nothing, so a
      // passive visitor still leaves no `auth.users` row behind.
      const sub = claims.data?.claims.sub;
      if (!sub) {
        setState({ kind: "ready", rows: [] });
        return;
      }

      const { data, error } = await supabase
        .from("quick_play_sessions")
        .select(QUICK_PLAY_LIST_COLUMNS)
        // Redundant under RLS, but it keeps the (owner, updated_at desc) index
        // in play and matches the provider's style.
        .eq("owner", sub)
        .order("updated_at", { ascending: false });
      if (cancelled) return;

      if (error) {
        setState({ kind: "error", message: error.message });
        return;
      }

      // One unreadable row is dropped rather than taking the whole list down.
      const rows: QuickPlaySummary[] = [];
      for (const row of data) {
        const summary = toQuickPlaySummary(row);
        if (summary) rows.push(summary);
      }

      setState({ kind: "ready", rows });
    };

    void load().catch((error: unknown) => {
      if (!cancelled) setState({ kind: "error", message: messageOf(error) });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async (id: string) => {
    const { error } = await createClient()
      .from("quick_play_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      setState({ kind: "error", message: error.message });
      return;
    }

    setState((current) =>
      current.kind === "ready"
        ? { kind: "ready", rows: current.rows.filter((row) => row.id !== id) }
        : current,
    );
  };

  if (state.kind === "loading") {
    return (
      <p style={{ fontSize: "13px", opacity: 0.65 }}>
        Looking for your saved quick plays…
      </p>
    );
  }

  if (state.kind === "off") {
    return (
      <CalloutPanel size="lg">
        <Tag tone="accent-2" size="md">
          Not configured
        </Tag>
        <h2 style={{ fontSize: "24px", margin: "12px 0 6px" }}>
          Quick Play needs a database
        </h2>
        <p
          style={{
            fontSize: "14.5px",
            lineHeight: 1.6,
            opacity: 0.78,
            margin: 0,
            maxWidth: "60ch",
          }}
        >
          Quick plays are saved so you can come back to them, and this site has
          no Supabase project configured — so there is nothing to save to and
          nothing to list. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and reload.
        </p>
      </CalloutPanel>
    );
  }

  if (state.kind === "error") {
    return (
      <p role="alert" style={{ fontSize: "13px", opacity: 0.8, maxWidth: "60ch" }}>
        We couldn&apos;t load your quick plays — {state.message}. Reload to try
        again.
      </p>
    );
  }

  if (state.rows.length === 0) {
    return (
      <div>
        <CalloutPanel
          size="lg"
          radius="calc(var(--radius-lg) * 1.6)"
          style={{ padding: "clamp(28px, 5vw, 48px) clamp(24px, 5vw, 56px)" }}
        >
          <Tag tone="accent-2" size="md">
            Club night · No sign-up
          </Tag>
          <h2 style={{ fontSize: "24px", margin: "12px 0 6px" }}>
            Names in. Teams out. Bracket on the wall.
          </h2>
          <p
            style={{
              fontSize: "14.5px",
              lineHeight: 1.6,
              opacity: 0.78,
              margin: "0 0 20px",
              maxWidth: "60ch",
            }}
          >
            You haven&apos;t started a quick play yet. Add whoever turned up,
            split them into teams and draw a bracket — no account, no entry, no
            setup. Each one is saved under its own title, so last Tuesday&apos;s
            is still here when tonight&apos;s is running.
          </p>
          <ButtonLink href="/quick-play/new" variant="primary" large>
            New quick play
          </ButtonLink>
        </CalloutPanel>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "28px",
            marginTop: "40px",
          }}
        >
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h3 style={{ fontSize: "19px", margin: "0 0 8px" }}>
                {feature.title}
              </h3>
              <p
                style={{
                  fontSize: "14.5px",
                  lineHeight: 1.6,
                  opacity: 0.78,
                  margin: 0,
                }}
              >
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "22px",
      }}
    >
      {state.rows.map((row) => (
        <Card key={row.id} style={{ padding: "22px" }}>
          <CardKicker>Last saved {formatSavedAt(row.updatedAt)}</CardKicker>
          <CardTitle style={{ fontSize: "19px", margin: "4px 0 10px" }}>
            {row.title}
          </CardTitle>
          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <Tag tone="accent-2">{formatLabel(row.format)}</Tag>
            <Tag tone="neutral">{row.teamCount} teams</Tag>
            <Tag tone="neutral">
              {row.playerCount} player{row.playerCount === 1 ? "" : "s"}
            </Tag>
          </div>
          <ButtonLink href={`/quick-play/${row.id}`} variant="secondary" block>
            Open
          </ButtonLink>
          {/* The same two-step confirm as the session page's wipe, kept local:
              sharing it would mean rewriting `save-status.tsx`, and deleting a
              quick play is a different enough promise to be worth its own copy. */}
          <Button
            variant="ghost"
            block
            onClick={() => {
              if (armedId !== row.id) {
                setArmedId(row.id);
                return;
              }
              setArmedId(null);
              void remove(row.id);
            }}
          >
            {armedId === row.id
              ? `Delete “${row.title}” — press again`
              : "Delete"}
          </Button>
        </Card>
      ))}
    </div>
  );
}
