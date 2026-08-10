import type { Metadata } from "next";

import { DashboardContent } from "./dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your next tournament and your player profile.",
};

export default function DashboardPage() {
  return <DashboardContent />;
}
