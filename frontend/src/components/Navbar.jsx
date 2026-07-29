import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bike, Menu, X, LogOut, LayoutDashboard, ShieldCheck, Phone, ChevronDown, User, Sun, Moon, Monitor, Clock, BarChart3, Search, PieChart, Calendar, FileText, Bell, KeyRound, DollarSign, Heart } from 'lucide-react';
import NotificationBell from './NotificationBell';
import AdminNotificationBell from './admin/AdminNotificationBell';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, cycle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const closeMenus = () => { setMobileOpen(false); setUserDropdownOpen(false); setMoreDropdownOpen(false); };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeMenus();
  }, [location.pathname]);

  useEffect(() => {
    if (!userDropdownOpen) return;
    const handler = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [userDropdownOpen]);

  useEffect(() => {
    if (!moreDropdownOpen) return;
    const handler = (e) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target)) setMoreDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [moreDropdownOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) && !e.target.closest('button[aria-label]')) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!userDropdownOpen && !moreDropdownOpen && !mobileOpen) return;
    const handler = (e) => { if (e.key === 'Escape') closeMenus(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [userDropdownOpen, moreDropdownOpen, mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
    setUserDropdownOpen(false);
    setMoreDropdownOpen(false);
  };

  const moreItems = [
    ...(user?.role === 'Admin' || user?.role === 'Renter' ? [
      { to: user?.role === 'Admin' ? '/admin-dashboard' : '/renter-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ] : []),
    { to: '/policies', icon: ShieldCheck, label: 'Policies' },
    ...(user?.role === 'Admin' || user?.role === 'Renter' ? [
      { to: '/fleet', icon: BarChart3, label: 'Fleet' },
    ] : []),
    ...(user?.role === 'Admin' ? [
      { to: '/analytics', icon: PieChart, label: 'Analytics' },
      { to: '/seasonal-pricing', icon: Calendar, label: 'Seasonal' },
      { to: '/refunds', icon: DollarSign, label: 'Refunds' },
    ] : []),
    ...(user?.role === 'Admin' || user?.role === 'Renter' ? [
      { to: '/vehicle-docs', icon: FileText, label: 'Docs' },
    ] : []),
  ];

  const userMenuItems = [
    ...(user?.role === 'Admin' || user?.role === 'Renter' ? [{
      to: user?.role === 'Admin' ? '/admin-dashboard' : '/renter-dashboard',
      icon: LayoutDashboard, label: 'Dashboard',
    }] : []),
    { to: '/my-bookings', icon: Clock, label: 'My Bookings' },
    { to: '/wishlist', icon: Heart, label: 'Favorites' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center text-lg font-bold group whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center mr-2 group-hover:scale-105 transition-transform">
              <Bike size={20} className="text-white" />
            </div>
            <span className="hidden sm:inline">Rent Bike<br className="sm:hidden" /><span className="sm:hidden"> </span>Cox's Bazar</span>
            <span className="sm:hidden">RBC</span>
          </Link>

          <div className="hidden xl:flex items-center text-sm">
            <div className="flex items-center px-2 py-1" style={{ color: 'var(--text-secondary)' }}>
              <Phone size={12} className="mr-1" style={{ color: 'var(--accent-text)' }} />
              <span className="text-[11px]">01891154443</span>
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>|</span>
            <div className="flex items-center px-2 py-1" style={{ color: 'var(--text-secondary)' }}>
              <Phone size={12} className="mr-1" style={{ color: 'var(--accent-text)' }} />
              <span className="text-[11px]">01764466757</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            <button onClick={cycle} className="flex items-center justify-center w-9 h-9 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }} title={`Theme: ${theme}`} aria-label="Toggle theme">
              <ThemeIcon size={16} />
            </button>
            <Link to="/search" className="flex items-center justify-center w-9 h-9 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }} title="Search" aria-label="Search vehicles">
              <Search size={16} />
            </Link>
            <Link to="/policies" className="items-center text-xs px-3 py-2 rounded-lg transition-all whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck size={14} className="mr-1" />
              Policies
            </Link>

            {user ? (
              <>
                <NotificationBell />
                <div className="relative" ref={moreDropdownRef}>
                  <button onClick={() => setMoreDropdownOpen(!moreDropdownOpen)} className="flex items-center text-xs px-3 py-2 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }} aria-label="More menu" aria-expanded={moreDropdownOpen} aria-haspopup="true">
                    More<ChevronDown size={12} className={`ml-0.5 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {moreDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl animate-slide-up z-[100] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)' }}>
                      <div className="py-1">
                        {moreItems.map(item => (
                          <Link key={item.to} to={item.to} onClick={() => setMoreDropdownOpen(false)}
                            className="flex items-center text-sm px-4 py-3 transition-all"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <item.icon size={14} className="mr-2 flex-shrink-0" /> {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={userDropdownRef}>
                  <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="flex items-center text-xs px-3 py-2 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }} aria-label="User menu" aria-expanded={userDropdownOpen} aria-haspopup="true">
                    <div className="w-7 h-7 gradient-primary rounded-full flex items-center justify-center mr-1.5">
                      <User size={13} className="text-white" />
                    </div>
                    <span className="max-w-[80px] truncate">{user.name}</span>
                    <ChevronDown size={12} className={`ml-0.5 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl animate-slide-up z-[100] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)' }}>
                      <div className="px-4 py-3 flex flex-col gap-0.5" style={{ borderBottom: '1px solid var(--border-base)' }}>
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                        <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-md w-fit" style={{ color: 'var(--accent-text)', background: 'var(--accent-bg)' }}>{user.role}</span>
                      </div>
                      <div className="py-1">
                        {userMenuItems.map(item => (
                          <Link key={item.to} to={item.to} onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center w-full text-left text-sm px-4 py-3 transition-all"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <item.icon size={14} className="mr-2" /> {item.label}
                          </Link>
                        ))}
                        <div className="my-1" style={{ borderTop: '1px solid var(--border-base)' }} />
                        <Link to="/profile" onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center w-full text-left text-sm px-4 py-3 transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <User size={14} className="mr-2" /> Profile
                        </Link>
                        <Link to="/change-password" onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center w-full text-left text-sm px-4 py-3 transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <KeyRound size={14} className="mr-2" /> Change Password
                        </Link>
                        <Link to="/notification-settings" onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center w-full text-left text-sm px-4 py-3 transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <Bell size={14} className="mr-2" /> Notification Settings
                        </Link>
                        <button onClick={handleLogout} className="flex items-center w-full text-left text-sm px-4 py-3 transition-all" style={{ color: 'var(--danger-text)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.filter = 'brightness(1.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.filter = ''; }}>
                          <LogOut size={14} className="mr-2" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-xs px-3 py-2 rounded-lg transition-all whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Login</Link>
                <Link to="/signup" className="btn-primary text-xs !px-3 !py-2 whitespace-nowrap">Sign Up</Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 min-h-11 min-w-11 rounded-lg transition-all flex items-center justify-center" style={{ color: 'var(--text-primary)' }} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div ref={mobileMenuRef} className="lg:hidden glass-dark border-t animate-slide-up" style={{ borderColor: 'var(--border-base)' }}>
          <div className="px-4 py-4 space-y-1">
            <div className="flex items-center text-sm px-3 py-2.5 min-h-11" style={{ color: 'var(--text-muted)' }}>
              <Phone size={14} className="mr-2" style={{ color: 'var(--accent-text)' }} />
              01891154443 | 01764466757
            </div>
            <button onClick={() => { cycle(); }} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg transition-all w-full text-left" style={{ color: 'var(--text-secondary)' }} aria-label="Toggle theme">
              <ThemeIcon size={16} className="mr-2" /> Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </button>
            <Link to="/search" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
              <Search size={16} className="mr-2" /> Search
            </Link>
            {user ? (
              <>
                <div className="px-3 py-2.5 border-t mt-2 pt-3 min-h-11" style={{ borderColor: 'var(--border-base)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  <p className="text-xs" style={{ color: 'var(--accent-text)' }}>{user.role}</p>
                </div>
                {moreItems.map(item => (
                  <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
                    <item.icon size={16} className="mr-2" /> {item.label}
                  </Link>
                ))}
                <Link to="/my-bookings" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
                  <Clock size={16} className="mr-2" /> My Bookings
                </Link>
                <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
                  <Heart size={16} className="mr-2" /> Favorites
                </Link>
                <div className="flex items-center gap-3 px-3 py-2.5 min-h-11">
                  <NotificationBell />
                  {user.role === 'Admin' && <AdminNotificationBell />}
                </div>
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
                  <User size={16} className="mr-2" /> Profile
                </Link>
                <Link to="/change-password" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
                  <KeyRound size={16} className="mr-2" /> Change Password
                </Link>
                <button onClick={handleLogout} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg transition-all w-full text-left" style={{ color: 'var(--danger-text)' }} aria-label="Log out" onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'} onMouseLeave={e => e.currentTarget.style.filter = ''}>
                  <LogOut size={16} className="mr-2" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/policies" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
                  <ShieldCheck size={16} className="mr-2" /> Policies
                </Link>
                <div className="flex space-x-2 pt-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-ghost !py-3 text-sm flex-1 text-center min-h-11 flex items-center justify-center">Login</Link>
                  <Link to="/signup" onClick={() => setMobileOpen(false)} className="btn-primary !py-3 text-sm flex-1 text-center min-h-11 flex items-center justify-center">Sign Up</Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
