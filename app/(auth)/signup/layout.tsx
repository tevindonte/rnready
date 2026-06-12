import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Create Free Account",
  description:
    "Sign up for RNReady free NCLEX RN practice, readiness analytics, mock exams, and custom study guides.",
  path: "/signup",
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
