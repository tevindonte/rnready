export const SITE_NAME = "RNReady";
export const SITE_TAGLINE = "NCLEX RN Practice & Mock Exams";
export const SITE_DESCRIPTION =
  "NCLEX RN practice questions, mock exams, adaptive drills, and AI explanations built for nursing students preparing for licensure.";
export const CONTACT_EMAIL = "jmcanboy@gmail.com";
export const COPYRIGHT_YEAR = 2026;

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function copyrightNotice(): string {
  return `© ${COPYRIGHT_YEAR} ${SITE_NAME}. All rights reserved.`;
}
