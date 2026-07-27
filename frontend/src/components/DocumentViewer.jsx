import { FileText, ExternalLink, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

const TYPE_LABELS = {
  registration: 'Registration',
  insurance: 'Insurance',
  fitness: 'Fitness',
  pollution: 'Pollution',
  other: 'Other',
};

function getExpiryStatus(date) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffDays = (d - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { label: 'Expired', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  if (diffDays <= 30) return { label: `${Math.ceil(diffDays)}d left`, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
  if (diffDays <= 90) return { label: `${Math.ceil(diffDays)}d left`, color: '#fb923c', bg: 'rgba(251,146,60,0.08)' };
  return null;
}

export default function DocumentViewer({ documents, onVerify, onDelete }) {
  if (!documents?.length) {
    return (
      <div className="text-center py-8 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--card-bg)', border: '1px solid var(--border-base)' }}>
        <FileText size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map(doc => {
        const expiry = getExpiryStatus(doc.expiryDate);
        return (
          <div
            key={doc._id}
            className="flex items-start justify-between rounded-xl p-4 gap-3"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-base)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                  {TYPE_LABELS[doc.type] || doc.type}
                </span>
                {doc.verified && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle size={10} /> Verified
                  </span>
                )}
                {expiry && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: expiry.bg, color: expiry.color }}>
                    <AlertTriangle size={10} /> {expiry.label}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{doc.name}</p>
              <div className="text-xs mt-1 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                {doc.documentNumber && <p>Number: {doc.documentNumber}</p>}
                {doc.issuingAuthority && <p>Authority: {doc.issuingAuthority}</p>}
                {doc.issueDate && <p>Issued: {new Date(doc.issueDate).toLocaleDateString()}</p>}
                {doc.expiryDate && <p>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-colors hover:bg-amber-500/10"
                style={{ color: 'var(--text-muted)' }}
                title="View"
                aria-label="View document"
              >
                <ExternalLink size={16} />
              </a>
              {onVerify && !doc.verified && (
                <button onClick={() => onVerify(doc._id)} className="p-2 rounded-lg transition-colors hover:bg-emerald-500/10 text-emerald-400" title="Verify" aria-label="Verify document">
                  <CheckCircle size={16} />
                </button>
              )}
              {onDelete && (
                <button onClick={() => { if (window.confirm('Delete this document?')) onDelete(doc._id); }} className="p-2 rounded-lg transition-colors hover:bg-red-500/10 text-red-400" title="Delete" aria-label="Delete document">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
