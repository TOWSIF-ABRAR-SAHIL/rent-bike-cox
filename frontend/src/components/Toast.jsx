import { useState, useCallback, createContext } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
export { ToastContext };

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const styles = {
    success: { background: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success-text)' },
    error: { background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' },
    info: { background: 'var(--info-bg)', borderColor: 'var(--info-border)', color: 'var(--info-text)' },
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-20 right-4 z-[300] space-y-2 w-[calc(100vw-2rem)] max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center p-4 rounded-xl glass shadow-xl border ${styles[toast.type] ? '' : ''}`}
            style={styles[toast.type] || styles.info}
          >
            {toast.type === 'success' && <CheckCircle className="mr-3 flex-shrink-0" size={18} />}
            {toast.type === 'error' && <XCircle className="mr-3 flex-shrink-0" size={18} />}
            {toast.type === 'info' && <Info className="mr-3 flex-shrink-0" size={18} />}
            <span className="flex-1 text-sm">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} aria-label="Dismiss notification" className="ml-3 flex-shrink-0 hover:opacity-70 p-2 min-w-9 min-h-9 flex items-center justify-center">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
