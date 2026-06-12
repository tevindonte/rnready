import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-meta";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/quiz/config", "/login", "/signup", "/terms", "/privacy"],
        disallow: [
          "/api/",
          "/admin/",
          "/home",
          "/analytics",
          "/settings",
          "/study-guide",
          "/study-guides",
          "/quiz/guest",
          "/quiz/*/review",
          "/auth/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
