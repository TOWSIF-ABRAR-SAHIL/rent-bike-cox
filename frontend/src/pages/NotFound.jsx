import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => (
  <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
    <div className="text-center animate-fade-in">
      <h1 className="text-6xl sm:text-8xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-4">404</h1>
      <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>Page not found</p>
      <Link to="/" className="btn-primary inline-flex items-center">
        <Home size={18} className="mr-2" /> Go Home
      </Link>
    </div>
  </div>
);

export default NotFound;
