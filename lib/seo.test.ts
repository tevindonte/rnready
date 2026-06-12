import { describe, expect, it } from "vitest";
import {
  buildPageMetadata,
  faqJsonLd,
  LANDING_FAQ,
  organizationJsonLd,
  PUBLIC_SITEMAP_PATHS,
} from "./seo";
import { getSiteUrl } from "./site-meta";

describe("seo", () => {
  it("buildPageMetadata includes canonical and OG tags", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://rnready.com";
    const meta = buildPageMetadata({
      title: "Test Page",
      description: "Test description",
      path: "/quiz/config",
    });
    expect(meta.title).toBe("Test Page | RNReady");
    expect(meta.alternates?.canonical).toBe("https://rnready.com/quiz/config");
    expect(meta.openGraph?.url).toBe("https://rnready.com/quiz/config");
    expect(meta.twitter?.card).toBe("summary_large_image");
  });

  it("marks noIndex pages correctly", () => {
    const meta = buildPageMetadata({
      title: "Private",
      description: "Private page",
      noIndex: true,
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("generates valid JSON-LD", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://rnready.com";
    const org = organizationJsonLd();
    expect(org["@type"]).toBe("Organization");
    expect(org.url).toBe(getSiteUrl());

    const faq = faqJsonLd(LANDING_FAQ);
    expect(faq.mainEntity).toHaveLength(LANDING_FAQ.length);
  });

  it("lists public sitemap paths", () => {
    expect(PUBLIC_SITEMAP_PATHS).toContain("/");
    expect(PUBLIC_SITEMAP_PATHS).toContain("/quiz/config");
  });
});
