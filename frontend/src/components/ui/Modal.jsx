import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, children, className = '' }) => {
  const [closeHovered, setCloseHovered] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const closeBtnStyle = closeHovered
    ? { backgroundColor: 'var(--hover-bg)', color: 'var(--text-primary)' }
    : { color: 'var(--text-secondary)' };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative glass rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-slide-up ${className}`}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-base)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="p-3 rounded-lg transition-colors"
            style={closeBtnStyle}
            aria-label="Close"
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
