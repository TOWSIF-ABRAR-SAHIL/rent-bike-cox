import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../useToast';
import { FileText, RefreshCw, Download, Search, X, ChevronDown, ChevronUp } from 'lucide-react';

const LOG_LEVEL_COLORS = {
  error: { color: 'var(--danger-text)', bg: 'var(--danger-bg)' },
  warn: { color: 'var(--warning-text)', bg: 'var(--warning-bg)' },
  info: { color: 'var(--info-text)', bg: 'var(--info-bg)' },
  debug: { color: 'var(--text-muted)', bg: 'var(--hover-bg)' },
};

const LogsViewer = () => {
  const { addToast } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState('app');
  const [lineCount, setLineCount] = useState(200);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/logs?type=${logType}&lines=${lineCount}`);
      setEntries(res.data.entries || []);
    } catch {
      setError('Failed to load logs');
      addToast('Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [logType, lineCount, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, [fetchLogs]);

  const filtered = searchTerm
    ? entries.filter(e => {
        const str = typeof e.content === 'string' ? e.content : JSON.stringify(e.content);
        return str.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : entries;

  const handleExport = () => {
    const blob = new Blob(
      [entries.map(e => typeof e.content === 'string' ? e.content : JSON.stringify(e.content)).join('\n')],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${logType === 'error' ? 'server-error' : 'server'}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelStyle = (entry) => {
    const level = entry.content?.level || entry.content?.severity || '';
    return LOG_LEVEL_COLORS[level] || { color: 'var(--text-primary)', bg: 'transparent' };
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: 'var(--accent-text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Logs Viewer</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="p-2 rounded-lg border text-xs flex items-center gap-1" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Export logs"><Download size={14} /> Export</button>
            <button onClick={fetchLogs} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)' }} aria-label="Refresh logs"><RefreshCw size={16} /></button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <button onClick={() => setLogType('app')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${logType === 'app' ? 'gradient-primary text-white' : ''}`}
              style={logType !== 'app' ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-base)' } : { borderColor: 'transparent' }}
              aria-label="Show app logs">App</button>
            <button onClick={() => setLogType('error')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${logType === 'error' ? 'gradient-primary text-white' : ''}`}
              style={logType !== 'error' ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-base)' } : { borderColor: 'transparent' }}
              aria-label="Show error logs">Errors</button>
          </div>
          <div className="flex gap-2 flex-1">
            <select value={lineCount} onChange={e => setLineCount(Number(e.target.value))}
              className="input-dark text-xs !py-1.5" aria-label="Line count">
              <option value="50">50 lines</option>
              <option value="200">200 lines</option>
              <option value="500">500 lines</option>
              <option value="1000">1000 lines</option>
            </select>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filter logs..." className="input-dark text-xs w-full pl-8 !py-1.5" aria-label="Filter logs" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2" aria-label="Clear filter"><X size={12} style={{ color: 'var(--text-muted)' }} /></button>}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="glass rounded-2xl p-8 border text-center" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-sm mb-3" style={{ color: 'var(--danger-text)' }}>{error}</p>
          <button onClick={fetchLogs} className="btn-primary text-sm">Retry</button>
        </div>
      ) : loading ? (
        <div className="space-y-1">{[...Array(10)].map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 border text-center" style={{ borderColor: 'var(--border-base)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{searchTerm ? 'No logs match your filter' : 'No logs available'}</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border-base)' }}>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0" style={{ background: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="p-2 font-medium w-12" style={{ color: 'var(--text-muted)' }}>#</th>
                  <th className="p-2 font-medium" style={{ color: 'var(--text-muted)' }}>Timestamp</th>
                  <th className="p-2 font-medium w-16" style={{ color: 'var(--text-muted)' }}>Level</th>
                  <th className="p-2 font-medium" style={{ color: 'var(--text-muted)' }}>Message</th>
                  <th className="p-2 font-medium w-10" style={{ color: 'var(--text-muted)' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const levelStyle = getLevelStyle(entry);
                  const content = entry.content || {};
                  const isExpanded = expandedEntry === i;
                  return (
                    <tr key={i} className="border-b transition-colors cursor-pointer" style={{ borderColor: 'var(--border-base)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                      onClick={() => setExpandedEntry(isExpanded ? null : i)}>
                      <td className="p-2" style={{ color: 'var(--text-muted)' }}>{entry.line}</td>
                      <td className="p-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{content.timestamp ? new Date(content.timestamp).toLocaleTimeString('en-BD') : '—'}</td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={levelStyle}>
                          {content.level || '—'}
                        </span>
                      </td>
                      <td className="p-2 truncate max-w-[200px] sm:max-w-[300px]" style={{ color: 'var(--text-primary)' }}>{content.message || (typeof content === 'string' ? content : '')}</td>
                      <td className="p-2">
                        {isExpanded ? <ChevronUp size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expandedEntry !== null && filtered[expandedEntry] && (
        <div className="glass rounded-2xl p-4 border" style={{ borderColor: 'var(--accent-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Log Detail</h4>
            <button onClick={() => setExpandedEntry(null)} className="p-1 rounded" aria-label="Close detail"><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
          </div>
          <pre className="text-xs whitespace-pre-wrap break-all max-h-80 overflow-y-auto p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            {JSON.stringify(filtered[expandedEntry].content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default LogsViewer;
