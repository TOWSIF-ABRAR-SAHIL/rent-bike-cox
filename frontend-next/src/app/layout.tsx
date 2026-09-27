import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import CompareBar from "@/components/CompareBar";
import ScrollToTop from "@/components/ScrollToTop";
import PageSpinner from "@/components/PageSpinner";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rent Bike Cox's Bazar | Bike, Car & Jeep Rental",
  description:
    "Rent bikes, cars, and jeeps in Cox's Bazar. Affordable hourly rates, instant booking, and flexible cancellation.",
  keywords:
    "bike rental, car rental, jeep rental, Cox's Bazar, Bangladesh, rent bike, vehicle hire",
  authors: [{ name: "Rent Bike Cox's Bazar" }],
  robots: "index, follow",
  metadataBase: new URL("https://rent-bike-cox.vercel.app"),
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    type: "website",
    title: "Rent Bike Cox's Bazar — Bike, Car & Jeep Rental",
    description:
      "Rent bikes, cars, and jeeps in Cox's Bazar. Affordable hourly rates starting at 200 TK/hr.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    url: "https://rent-bike-cox.vercel.app",
    siteName: "Rent Bike Cox's Bazar",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rent Bike Cox's Bazar",
    description: "Affordable bike, car & jeep rental in Cox's Bazar",
    images: ["/opengraph-image"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rent Bike",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0f] antialiased`}>
        <Providers>
          <ScrollToTop />
          <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden">
            <Navbar />
            <main className="pt-[72px]">
              <Suspense fallback={<PageSpinner />}>{children}</Suspense>
            </main>
            <Footer />
            <BottomNav />
            <WhatsAppButton />
            <CompareBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
