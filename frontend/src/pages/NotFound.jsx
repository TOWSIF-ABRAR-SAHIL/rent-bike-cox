import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import useSiteContent from '../hooks/useSiteContent';

const NotFound = () => {
  const { get } = useSiteContent();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="text-center animate-fade-in">
        <h1 className="text-6xl sm:text-8xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-4">404</h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>{get('notFound.title', 'Page not found')}</p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{get('notFound.message', 'The page you\'re looking for doesn\'t exist or has been moved.')}</p>
        <Link to="/" className="btn-primary inline-flex items-center">
          <Home size={18} className="mr-2" /> {get('notFound.cta', 'Go Home')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
