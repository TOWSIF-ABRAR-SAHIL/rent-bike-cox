import { Loader2 } from 'lucide-react';

export default function PageSpinner() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
    </div>
  );
}
