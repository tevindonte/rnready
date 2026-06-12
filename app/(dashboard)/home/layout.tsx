import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Dashboard",
  description: "Your RNReady NCLEX prep dashboard.",
  path: "/home",
  noIndex: true,
});

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
