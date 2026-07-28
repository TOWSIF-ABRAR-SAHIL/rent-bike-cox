import { useState, useEffect, useCallback, memo } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Search } from 'lucide-react';
import api from '../api/axios';

const FAQPage = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [helpfulMap, setHelpfulMap] = useState({});

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/faqs');
      setFaqs(res.data);
      const cats = {};
      res.data.forEach(f => { cats[f.category] = true; });
      setExpanded(cats);
    } catch {
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFaqs(); }, [fetchFaqs]);

  const trackHelpful = async (id, helpful) => {
    if (helpfulMap[id]) return;
    try {
      await api.post(`/faqs/${id}/helpful`, { helpful });
      setHelpfulMap(prev => ({ ...prev, [id]: helpful }));
    } catch { /* silent */ }
  };

  const grouped = {};
  faqs.forEach(f => {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  });

  const filtered = search
    ? faqs.filter(f => f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase()))
    : null;

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-sm mb-4" style={{ color: 'var(--danger-text)' }}>{error}</p>
      <button onClick={fetchFaqs} className="btn-primary text-sm">Try Again</button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
          <HelpCircle size={28} style={{ color: 'var(--accent-text)' }} />
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Frequently Asked Questions</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Find answers to common questions about our rental service</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-dark w-full pl-11" placeholder="Search questions..." aria-label="Search FAQs" />
      </div>

      {/* Filtered results */}
      {filtered ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No matching questions found</p>
          ) : (
            filtered.map(faq => <FAQItem key={faq._id} faq={faq} helpfulMap={helpfulMap} trackHelpful={trackHelpful} expanded={expanded} setExpanded={setExpanded} />)
          )}
        </div>
      ) : (
        /* Grouped by category */
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-6">
            <button onClick={() => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }))}
              className="flex items-center gap-2 mb-3 group" aria-label={`Toggle ${cat} category`}>
              {expanded[cat] ? <ChevronDown size={18} style={{ color: 'var(--accent-text)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />}
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{cat}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{items.length}</span>
            </button>
            {expanded[cat] && (
              <div className="space-y-2 ml-6">
                {items.map(faq => <FAQItem key={faq._id} faq={faq} helpfulMap={helpfulMap} trackHelpful={trackHelpful} expanded={expanded} setExpanded={setExpanded} />)}
              </div>
            )}
          </div>
        ))
      )}

      {/* Contact CTA */}
      <div className="glass rounded-2xl p-6 mt-8 text-center border" style={{ borderColor: 'var(--border-base)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Still have questions?</p>
        <a href="https://wa.me/880189154443" target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center text-sm">
          Contact Us on WhatsApp
        </a>
      </div>
    </div>
  );
};

const FAQItem = ({ faq, helpfulMap, trackHelpful }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-base)' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left transition-colors"
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
        aria-label={`Toggle answer for: ${faq.question}`}>
        <span className="text-sm font-medium pr-4" style={{ color: 'var(--text-primary)' }}>{faq.question}</span>
        {open ? <ChevronDown size={16} className="shrink-0" style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--text-muted)' }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{faq.answer}</p>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-base)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Was this helpful?</span>
            <button onClick={() => trackHelpful(faq._id, true)}
              disabled={!!helpfulMap[faq._id]}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all disabled:opacity-40"
              style={{ color: helpfulMap[faq._id] === true ? 'var(--success-text)' : 'var(--text-muted)' }}
              aria-label="Yes, helpful">
              <ThumbsUp size={12} /> {faq.helpfulCount || 0}
            </button>
            <button onClick={() => trackHelpful(faq._id, false)}
              disabled={!!helpfulMap[faq._id]}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all disabled:opacity-40"
              style={{ color: helpfulMap[faq._id] === false ? 'var(--danger-text)' : 'var(--text-muted)' }}
              aria-label="Not helpful">
              <ThumbsDown size={12} /> {faq.notHelpfulCount || 0}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(FAQPage);
