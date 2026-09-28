import type { Faq } from "@/types";

/**
 * Normalises `GET /api/faqs`, whose shape is
 * `{ categories: string[], faqs: { [category]: Faq[] } }`.
 *
 * The server render (see `app/faq/page.tsx`) and the client fetch in
 * `views/FAQ.tsx` / `views/Home.tsx` both go through this, so the two can never
 * disagree about ordering or about which items carry a category.
 */
export interface NormalizedFaqs {
  /** API order first, then any group key the API forgot to list. */
  categories: string[];
  /** Flattened, each item carrying its `category` group key. */
  faqs: Faq[];
}

export function normalizeFaqs(payload: unknown): NormalizedFaqs {
  const data = (payload ?? {}) as { categories?: unknown; faqs?: unknown };

  const grouped =
    data.faqs && typeof data.faqs === "object" && !Array.isArray(data.faqs)
      ? (data.faqs as Record<string, unknown>)
      : {};

  const declared = Array.isArray(data.categories)
    ? data.categories.filter((c): c is string => typeof c === "string")
    : [];

  const categories = [
    ...declared,
    ...Object.keys(grouped).filter((key) => !declared.includes(key)),
  ];

  const faqs: Faq[] = [];
  for (const category of categories) {
    const items = grouped[category];
    if (!Array.isArray(items)) continue;
    for (const item of items as Faq[]) {
      faqs.push({ ...item, category });
    }
  }

  return { categories, faqs };
}
