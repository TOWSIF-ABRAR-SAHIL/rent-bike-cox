"use client";

import Link from "next/link";

// Static offline fallback served by the service worker when navigations fail.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl" aria-hidden>
        &#x1F6DC;
      </p>
      <h1 className="mt-4 text-2xl font-bold">You are offline</h1>
      <p className="mt-2 text-sm opacity-70">
        Check your connection and try again. Your bookings are safe — nothing
        was lost.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-black"
      >
        Retry
      </Link>
    </main>
  );
}
