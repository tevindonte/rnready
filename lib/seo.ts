import type { Metadata } from "next";
import {
  CONTACT_EMAIL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/site-meta";

export const SEO_KEYWORDS = [
  "NCLEX prep",
  "NCLEX practice questions",
  "NCLEX RN",
  "nursing exam prep",
  "NCLEX mock exam",
  "NCLEX readiness",
  "nursing student study",
  "SATA questions",
  "adaptive NCLEX practice",
  "RNReady",
] as const;

const DEFAULT_OG_IMAGE = "/logo.png";

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  keywords?: string[];
};

export function buildPageMetadata(options: PageMetadataOptions): Metadata {
  const siteUrl = getSiteUrl();
  const url = options.path ? `${siteUrl}${options.path}` : siteUrl;
  const title = options.title.includes(SITE_NAME)
    ? options.title
    : `${options.title} | ${SITE_NAME}`;

  return {
    title,
    description: options.description,
    keywords: options.keywords ?? [...SEO_KEYWORDS],
    alternates: { canonical: url },
    robots: options.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: SITE_NAME,
      title,
      description: options.description,
      images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: options.description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function rootMetadata(): Metadata {
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${SITE_NAME} | NCLEX RN Practice Questions & Mock Exams`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [...SEO_KEYWORDS],
    authors: [{ name: SITE_NAME, url: siteUrl }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "education",
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png" }],
      apple: [{ url: "/apple-icon.png", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      siteName: SITE_NAME,
      title: `${SITE_NAME} | ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
      images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} | ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

export type FaqItem = { question: string; answer: string };

export function organizationJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: SITE_DESCRIPTION,
    email: CONTACT_EMAIL,
  };
}

export function websiteJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/quiz/config`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationJsonLd(questionCount?: number) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier with optional RNReady Plus subscription",
    },
    description:
      questionCount && questionCount > 0
        ? `${SITE_DESCRIPTION}. ${questionCount}+ NCLEX-style practice questions.`
        : SITE_DESCRIPTION,
    url: siteUrl,
  };
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export const LANDING_FAQ: FaqItem[] = [
  {
    question: "Is RNReady free to use?",
    answer:
      "Yes. You can try 10 questions without an account. Signed-up users get unlimited practice on core modes. RNReady Plus adds AI tutor, audio explanations, and expanded study guides.",
  },
  {
    question: "Does RNReady include NCLEX mock exams?",
    answer:
      "Yes. After 50 practice answers, you unlock an 85-question mock exam weighted to NCLEX category proportions, with exam-day tools and end-of-exam review.",
  },
  {
    question: "What question types does RNReady support?",
    answer:
      "RNReady includes standard multiple-choice and SATA (select-all-that-apply) NCLEX-style items, with instant rationales in review mode and readiness analytics by category.",
  },
  {
    question: "How does RNReady track NCLEX readiness?",
    answer:
      "Your dashboard shows a weighted readiness score based on NCLEX test plan category weights, separate mock exam performance, weak-area drills, and score trends over time.",
  },
];

export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/quiz/config",
  "/login",
  "/signup",
  "/terms",
  "/privacy",
] as const;

export const NOINDEX_PATH_PREFIXES = [
  "/home",
  "/analytics",
  "/settings",
  "/study-guide",
  "/study-guides",
  "/admin",
  "/quiz/guest",
] as const;
