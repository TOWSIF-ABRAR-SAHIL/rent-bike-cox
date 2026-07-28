import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, Clock, User } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useWishlist } from '../context/useWishlist';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/wishlist', icon: Heart, label: 'Saved', auth: true },
  { to: '/my-bookings', icon: Clock, label: 'Bookings', auth: true },
];

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { count } = useWishlist();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-dark border-t" style={{ borderColor: 'var(--border-base)' }}>
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(item => {
          if (item.auth && !user) return null;
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[56px] rounded-xl transition-all relative"
              style={{ color: active ? 'var(--accent-text)' : 'var(--text-muted)' }}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon size={20} fill={active ? 'currentColor' : 'none'} />
                {item.to === '/wishlist' && count > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: '#ef4444' }}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: 'var(--accent-text)' }} />
              )}
            </Link>
          );
        })}
        <Link
          to={user ? (user.role === 'Admin' ? '/admin-dashboard' : user.role === 'Renter' ? '/renter-dashboard' : '/profile') : '/login'}
          className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[56px] rounded-xl transition-all relative"
          style={{ color: isActive('/admin-dashboard') || isActive('/renter-dashboard') || isActive('/profile') ? 'var(--accent-text)' : 'var(--text-muted)' }}
          aria-label={user ? 'Dashboard' : 'Login'}
        >
          <div className="w-7 h-7 gradient-primary rounded-full flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <span className="text-[10px] font-medium">{user ? 'Account' : 'Login'}</span>
        </Link>
      </div>
    </nav>
  );
};

export default memo(BottomNav);
