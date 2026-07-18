import { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, children, className = '' }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative glass rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-slide-up ${className}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
