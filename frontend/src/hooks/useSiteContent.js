import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

let cachedContent = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

const useSiteContent = () => {
  const [content, setContent] = useState(cachedContent || {});
  const [loading, setLoading] = useState(!cachedContent);

  const fetchContent = useCallback(async () => {
    if (cachedContent && Date.now() - cacheTime < CACHE_TTL) {
      setContent(cachedContent);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/content');
      const map = {};
      res.data.forEach(item => { map[item.key] = item.value; });
      cachedContent = map;
      cacheTime = Date.now();
      setContent(map);
    } catch { /* use defaults */ }
    setLoading(false);
  }, []);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContent(); }, [fetchContent]);

  const get = (key, fallback = '') => content[key] || fallback;

  return { content, loading, get };
};

export default useSiteContent;
