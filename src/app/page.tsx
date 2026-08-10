import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  description:
    "Sign up, get seeded, show up and smash. Browse club and open badminton tournaments and enter in a couple of minutes.",
};

const FEATURES = [
  {
    title: "Brackets for every level",
    body: "Divisions by rating, not sign-up order.",
  },
  {
    title: "Coaches and clubs welcome",
    body: "Player, coach or club admin accounts.",
  },
  {
    title: "Draws and results, live",
    body: "Matches and results post the moment they're set.",
  },
];

export default function Home() {
  return (
    <div>
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding:
            "clamp(48px, 8vw, 96px) clamp(20px, 5vw, 72px) clamp(32px, 6vw, 64px)",
        }}
      >
        <span
          style={{
            display: "block",
            fontSize: "13px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "var(--color-accent-700)",
            marginBottom: "14px",
          }}
        >
          Autumn Open · Sept 12–14
        </span>
        <h1
          style={{
            fontSize: "clamp(40px, 5.8vw, 68px)",
            lineHeight: 1.08,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ display: "block" }}>Sign up. Get seeded.</span>
          <span style={{ display: "block" }}>Show up and smash.</span>
        </h1>
        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.65,
            maxWidth: "58ch",
            margin: "20px 0 0",
            opacity: 0.85,
          }}
        >
          Tournament entries for club and open events near you. Register once, play
          all season.
        </p>
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            flexWrap: "wrap",
            marginTop: "28px",
          }}
        >
          <ButtonLink href="/tournaments" variant="primary" large>
            Browse tournaments
          </ButtonLink>
          <ButtonLink href="/signin" variant="secondary" large>
            I already have an account
          </ButtonLink>
        </div>
      </section>

      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 clamp(20px, 5vw, 72px) clamp(28px, 5vw, 40px)",
        }}
      >
        <div
          style={{
            background: "var(--color-accent-2-100)",
            borderRadius: "calc(var(--radius-lg) * 1.6)",
            padding: "clamp(28px, 5vw, 48px) clamp(24px, 5vw, 56px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: "24px", margin: "0 0 6px" }}>
              Entries close a week before each event
            </h2>
            <p
              style={{
                fontSize: "14.5px",
                lineHeight: 1.6,
                opacity: 0.78,
                margin: 0,
                maxWidth: "48ch",
              }}
            >
              One account, every tournament this season.
            </p>
          </div>
          <ButtonLink
            href="/tournaments"
            variant="primary"
            large
            style={{ flex: "none" }}
          >
            Browse tournaments
          </ButtonLink>
        </div>
      </section>

      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px clamp(20px, 5vw, 72px) clamp(56px, 8vw, 88px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "28px",
        }}
      >
        {FEATURES.map((feature) => (
          <div key={feature.title}>
            <h3 style={{ fontSize: "21px", margin: "0 0 8px" }}>{feature.title}</h3>
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
      </section>
    </div>
  );
}
