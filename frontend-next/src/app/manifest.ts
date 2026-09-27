import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rent Bike Cox's Bazar",
    short_name: "Rent Bike",
    description:
      "Rent bikes, cars, and jeeps in Cox's Bazar. Affordable hourly rates, instant booking.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a0a0f",
    theme_color: "#f59e0b",
    lang: "en",
    dir: "ltr",
    categories: ["transportation", "travel"],
    icons: [
      { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
