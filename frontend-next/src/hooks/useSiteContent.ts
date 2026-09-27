"use client";

import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import type { SiteContentItem, SiteContentMap } from '@/types';

let cachedContent: SiteContentMap | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export interface SiteContent {
  content: SiteContentMap;
  loading: boolean;
  get: (key: string, fallback?: string) => string;
}

const useSiteContent = (): SiteContent => {
  const [content, setContent] = useState<SiteContentMap>(cachedContent || {});
  const [loading, setLoading] = useState(!cachedContent);

  const fetchContent = useCallback(async () => {
    if (cachedContent && Date.now() - cacheTime < CACHE_TTL) {
      setContent(cachedContent);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<SiteContentItem[]>('/content');
      const map: SiteContentMap = {};
      res.data.forEach((item) => {
        map[item.key] = item.value;
      });
      cachedContent = map;
      cacheTime = Date.now();
      setContent(map);
    } catch {
      /* use defaults */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional initial fetch on mount
    fetchContent();
  }, [fetchContent]);

  const get = (key: string, fallback = ''): string => content[key] || fallback;

  return { content, loading, get };
};

export default useSiteContent;
