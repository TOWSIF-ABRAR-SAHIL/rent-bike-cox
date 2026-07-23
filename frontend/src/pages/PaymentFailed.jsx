import { Link, useNavigate } from 'react-router-dom';
import { XCircle, Home, RefreshCw } from 'lucide-react';

const PaymentFailed = () => {
  const navigate = useNavigate();

  return (
  <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 gradient-hero relative overflow-hidden">
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-20 left-20 w-96 h-96 bg-red-500 rounded-full blur-[120px]" />
    </div>
    <div className="glass rounded-3xl p-6 sm:p-10 text-center max-w-md w-full animate-slide-up relative">
      <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
        <XCircle size={40} className="text-red-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Payment Failed</h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Something went wrong with your payment. Please try again.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/" className="btn-primary flex-1 flex items-center justify-center">
          <Home size={18} className="mr-2" /> Go Home
        </Link>
        <button onClick={() => navigate(-1)} className="btn-ghost flex-1 flex items-center justify-center">
          <RefreshCw size={18} className="mr-2" /> Try Again
        </button>
      </div>
    </div>
  </div>
  );
};

export default PaymentFailed;
