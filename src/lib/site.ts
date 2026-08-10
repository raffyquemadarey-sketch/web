export const siteConfig = {
  name: "RallyPoint",
  description:
    "Tournament entries for club and open badminton events near you. Register once, play all season.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
