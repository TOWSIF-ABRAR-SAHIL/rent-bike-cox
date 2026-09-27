import type { MetadataRoute } from "next";

const BASE = "https://rent-bike-cox.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/search`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/policies`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/signup`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/forgot-password`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
