import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bike, Menu, X, LogOut, LayoutDashboard, ShieldCheck, Phone, ChevronDown, User, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, cycle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const closeMenus = () => { setMobileOpen(false); setDropdownOpen(false); };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeMenus();
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
    setDropdownOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center text-lg font-bold group" style={{ color: 'var(--text-primary)' }}>
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center mr-2 group-hover:scale-105 transition-transform">
              <Bike size={20} className="text-white" />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Rent Bike Cox's Bazar</span>
            <span className="sm:hidden bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">RBC</span>
          </Link>

          <div className="hidden md:flex items-center space-x-1 text-sm">
            <div className="flex items-center px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Phone size={14} className="mr-1.5 text-cyan-400" />
              <span className="text-xs">01891154443</span>
            </div>
            <div className="w-px h-4" style={{ background: 'var(--border-base)' }}></div>
            <div className="flex items-center px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Phone size={14} className="mr-1.5 text-cyan-400" />
              <span className="text-xs">01764466757</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2">
            <button onClick={cycle} className="flex items-center text-sm px-3 py-2 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }} title={`Theme: ${theme}`} aria-label="Toggle theme">
              <ThemeIcon size={16} />
            </button>
            <div className="w-px h-4" style={{ background: 'var(--border-base)' }}></div>
            <Link to="/policies" className="flex items-center text-sm px-3 py-2 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck size={16} className="mr-1.5" />
              Policies
            </Link>
            {user ? (
              <>
                {(user.role === 'Admin' || user.role === 'Renter') && (
                  <Link to={user.role === 'Admin' ? '/admin-dashboard' : '/renter-dashboard'} className="flex items-center text-sm px-3 py-2 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
                    <LayoutDashboard size={16} className="mr-1.5" />
                    Dashboard
                  </Link>
                )}
                <div className="relative">
                  <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center text-sm px-3 py-2 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
                    <div className="w-7 h-7 gradient-primary rounded-full flex items-center justify-center mr-2">
                      <User size={14} className="text-white" />
                    </div>
                    <span className="max-w-[100px] truncate">{user.name}</span>
                    <ChevronDown size={14} className={`ml-1 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl animate-slide-up z-[100] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)' }}>
                      <div className="px-4 py-3 flex flex-col gap-0.5" style={{ borderBottom: '1px solid var(--border-base)' }}>
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                        <span className="inline-block mt-1 text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md w-fit">{user.role}</span>
                      </div>
                      <div className="py-1">
                        <button onClick={handleLogout} className="flex items-center w-full text-left text-sm text-red-400 hover:text-red-300 px-4 py-2.5 transition-all" onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <LogOut size={14} className="mr-2" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm px-3 py-2 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>Login</Link>
                <Link to="/signup" className="btn-primary text-sm !px-4 !py-2">Sign Up</Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg transition-all" style={{ color: 'var(--text-primary)' }}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden glass-dark border-t animate-slide-up" style={{ borderColor: 'var(--border-base)' }}>
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center text-sm px-3 py-2" style={{ color: 'var(--text-muted)' }}>
              <Phone size={14} className="mr-2 text-cyan-400" />
              01891154443 | 01764466757
            </div>
            <button onClick={() => { cycle(); }} className="flex items-center text-sm px-3 py-2.5 rounded-lg transition-all w-full text-left" style={{ color: 'var(--text-secondary)' }}>
              <ThemeIcon size={16} className="mr-2" /> Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </button>
            <Link to="/policies" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck size={16} className="mr-2" /> Policies
            </Link>
            {user ? (
              <>
                <div className="px-3 py-2 border-t mt-2 pt-3" style={{ borderColor: 'var(--border-base)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  <p className="text-xs text-primary-400">{user.role}</p>
                </div>
                {(user.role === 'Admin' || user.role === 'Renter') && (
                  <Link to={user.role === 'Admin' ? '/admin-dashboard' : '/renter-dashboard'} onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 rounded-lg transition-all" style={{ color: 'var(--text-secondary)' }}>
                    <LayoutDashboard size={16} className="mr-2" /> Dashboard
                  </Link>
                )}
                <button onClick={handleLogout} className="flex items-center text-red-400 hover:text-red-300 text-sm px-3 py-2.5 rounded-lg transition-all w-full text-left">
                  <LogOut size={16} className="mr-2" /> Logout
                </button>
              </>
            ) : (
              <div className="flex space-x-2 pt-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-ghost !py-2 text-sm flex-1 text-center">Login</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="btn-primary !py-2 text-sm flex-1 text-center">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
