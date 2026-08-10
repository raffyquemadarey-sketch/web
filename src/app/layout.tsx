import type { Metadata } from "next";

import { DemoModeBanner } from "@/components/layout/demo-mode-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { listTournaments } from "@/lib/data/repository";
import { DemoDataProvider } from "@/lib/demo/demo-data-provider";
import { DemoSessionProvider } from "@/lib/demo/demo-session-provider";
import { caprasimo, figtree } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "RallyPoint — badminton tournament entries",
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
};

export default async function RootLayout(props: LayoutProps<"/">) {
  const tournaments = await listTournaments();

  return (
    <html
      lang="en"
      className={`${caprasimo.variable} ${figtree.variable} antialiased`}
    >
      <body>
        <DemoSessionProvider>
          <DemoDataProvider initialTournaments={tournaments}>
            <div
              style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <SkipLink />
              <DemoModeBanner />
              <SiteHeader />
              <main
                id="main"
                /* Programmatically focusable so the skip link lands here in
                   every browser, but never a sequential tab stop itself. */
                tabIndex={-1}
                style={{ flex: 1, display: "flex", flexDirection: "column" }}
              >
                {props.children}
              </main>
              <SiteFooter />
            </div>
          </DemoDataProvider>
        </DemoSessionProvider>
      </body>
    </html>
  );
}
