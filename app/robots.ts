import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/restaurant/",
        "/impersonate",
        "/setup-your-store",
        "/reset-password",
      ],
    },
  };
}
