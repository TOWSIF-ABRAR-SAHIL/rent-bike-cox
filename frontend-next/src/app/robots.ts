import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin-dashboard",
          "/renter-dashboard",
          "/checkout/",
          "/invoice/",
          "/my-bookings",
          "/notifications",
          "/notification-settings",
          "/fleet",
          "/analytics",
          "/vehicle-docs",
          "/seasonal-pricing",
        ],
      },
    ],
    sitemap: "https://rent-bike-cox.vercel.app/sitemap.xml",
  };
}
