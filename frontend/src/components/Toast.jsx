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
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center p-4 rounded-xl glass shadow-xl max-w-sm animate-slide-in border ${styles[toast.type] || styles.info}`}
          >
            {toast.type === 'success' && <CheckCircle className="mr-3 flex-shrink-0" size={18} />}
            {toast.type === 'error' && <XCircle className="mr-3 flex-shrink-0" size={18} />}
            {toast.type === 'info' && <Info className="mr-3 flex-shrink-0" size={18} />}
            <span className="flex-1 text-sm">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-3 flex-shrink-0 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
