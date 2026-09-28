import type { ContentItem } from '@/types';

export interface NormalizedContent {
  map: Record<string, string>;
  metaMap: Record<string, ContentItem>;
  sections: string[];
}

/**
 * Normalises the two content responses the admin editor reads:
 *  - GET /admin/content       → ContentItem[]
 *  - GET /content/page/:page  → { page, sections, items: ContentItem[] }
 *
 * The page response used to be consumed as a Record<string, ContentItem[]> and each
 * value passed to `forEach` — the first value is the page-name string, so selecting a
 * page always failed with "Failed to load content". Both shapes now reduce to the same
 * list of items.
 */
export function groupContentPayload(payload: unknown): NormalizedContent {
  const items: ContentItem[] = Array.isArray(payload)
    ? (payload as ContentItem[])
    : (((payload as { items?: ContentItem[] } | null)?.items) ?? []);

  const map: Record<string, string> = {};
  const metaMap: Record<string, ContentItem> = {};
  const sections = new Set<string>();

  for (const item of items) {
    if (!item || typeof item.key !== 'string') continue;
    map[item.key] = item.value;
    metaMap[item.key] = item;
    if (item.section) sections.add(item.section);
  }

  return { map, metaMap, sections: [...sections] };
}
