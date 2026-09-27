"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { Bike, Menu, X, LogOut, LayoutDashboard, ShieldCheck, Phone, ChevronDown, User, Sun, Moon, Monitor, Clock, BarChart3, PieChart, Calendar, FileText, Bell, KeyRound, DollarSign, Heart } from 'lucide-react';
import NotificationBell from './NotificationBell';
import AdminNotificationBell from './admin/AdminNotificationBell';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/search', label: 'Vehicles' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, cycle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const closeMenus = () => { setMobileOpen(false); setUserDropdownOpen(false); setMoreDropdownOpen(false); };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeMenus();
  }, [pathname]);

  useEffect(() => {
    if (!userDropdownOpen) return;
    const handler = (e: MouseEvent | TouchEvent): void => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [userDropdownOpen]);

  useEffect(() => {
    if (!moreDropdownOpen) return;
    const handler = (e: MouseEvent | TouchEvent): void => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) setMoreDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [moreDropdownOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent | TouchEvent): void => {
      const target = e.target as Element;
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target) && !target.closest('button[aria-label]')) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!userDropdownOpen && !moreDropdownOpen && !mobileOpen) return;
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') closeMenus(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [userDropdownOpen, moreDropdownOpen, mobileOpen]);

  const handleLogout = () => {
    logout();
    router.push('/login');
    setMobileOpen(false);
    setUserDropdownOpen(false);
    setMoreDropdownOpen(false);
  };

  const isActive = (to: string, exact = false): boolean =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

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
    { to: '/my-disputes', icon: ShieldCheck, label: 'My Disputes' },
    { to: '/wishlist', icon: Heart, label: 'Favorites' },
  ];

  const dropdownPanel = 'absolute right-0 top-full mt-2 rounded-xl shadow-xl z-[100] overflow-hidden bg-white border border-slate-200 animate-slide-up';
  const dropdownLink = 'flex items-center w-full text-left text-sm px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all';

  return (
    <nav className="nav-light fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px] gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="Rent Bike Cox's Bazar home">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
              <Bike size={22} className="text-white" />
            </div>
            <div className="leading-none">
              <p className="text-[17px] font-black text-slate-900 tracking-tight">Rent Bike</p>
              <p className="text-[10px] font-bold tracking-[0.18em] text-orange-600 mt-0.5">COX&apos;S BAZAR</p>
            </div>
          </Link>

          {/* Center links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const active = isActive(link.to, link.exact);
              return (
                <Link key={link.to} href={link.to}
                  className={`relative px-4 py-2 text-sm font-bold transition-colors ${active ? 'text-orange-600' : 'text-slate-700 hover:text-slate-950'}`}>
                  {link.label}
                  {active && <span className="absolute left-4 right-4 -bottom-[1px] h-[3px] rounded-full bg-orange-500" />}
                </Link>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button onClick={cycle} className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all" title={`Theme: ${theme}`} aria-label="Toggle theme">
              <ThemeIcon size={17} />
            </button>

            {user ? (
              <>
                <NotificationBell />
                {moreItems.length > 0 && (
                  <div className="relative" ref={moreDropdownRef}>
                    <button onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                      className="flex items-center text-sm font-semibold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all"
                      aria-label="More menu" aria-expanded={moreDropdownOpen} aria-haspopup="true">
                      More<ChevronDown size={14} className={`ml-1 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {moreDropdownOpen && (
                      <div className={`${dropdownPanel} w-52`}>
                        <div className="py-1.5">
                          {moreItems.map(item => (
                            <Link key={item.to} href={item.to} onClick={() => setMoreDropdownOpen(false)} className={dropdownLink}>
                              <item.icon size={15} className="mr-2.5 flex-shrink-0 text-slate-400" /> {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative" ref={userDropdownRef}>
                  <button onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                    aria-label="User menu" aria-expanded={userDropdownOpen} aria-haspopup="true">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-black">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[90px] truncate text-sm font-bold text-slate-800">{user.name}</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {userDropdownOpen && (
                    <div className={`${dropdownPanel} w-60`}>
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-bold truncate text-slate-900">{user.name}</p>
                        <p className="text-xs truncate text-slate-500">{user.email}</p>
                        <span className="inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">{user.role}</span>
                      </div>
                      <div className="py-1.5">
                        {userMenuItems.map(item => (
                          <Link key={item.to} href={item.to} onClick={() => setUserDropdownOpen(false)} className={dropdownLink}>
                            <item.icon size={15} className="mr-2.5 text-slate-400" /> {item.label}
                          </Link>
                        ))}
                        <div className="my-1 border-t border-slate-100" />
                        <Link href="/profile" onClick={() => setUserDropdownOpen(false)} className={dropdownLink}>
                          <User size={15} className="mr-2.5 text-slate-400" /> Profile
                        </Link>
                        <Link href="/change-password" onClick={() => setUserDropdownOpen(false)} className={dropdownLink}>
                          <KeyRound size={15} className="mr-2.5 text-slate-400" /> Change Password
                        </Link>
                        <Link href="/notification-settings" onClick={() => setUserDropdownOpen(false)} className={dropdownLink}>
                          <Bell size={15} className="mr-2.5 text-slate-400" /> Notification Settings
                        </Link>
                        <button onClick={handleLogout} className={`${dropdownLink} text-red-600 hover:!bg-red-50`}>
                          <LogOut size={15} className="mr-2.5" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold px-5 py-2.5 rounded-lg bg-neutral-900 hover:bg-black text-white transition-all">
                  Sign In
                </Link>
                <Link href="/signup" className="text-sm font-bold px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-lg shadow-orange-500/30">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 min-h-11 min-w-11 rounded-lg text-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div ref={mobileMenuRef} className="lg:hidden bg-white border-t border-slate-200 shadow-xl animate-slide-up max-h-[calc(100dvh-72px)] overflow-y-auto">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map(link => {
              const active = isActive(link.to, link.exact);
              return (
                <Link key={link.to} href={link.to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center text-sm font-bold px-3 py-2.5 min-h-11 rounded-lg transition-all ${active ? 'bg-orange-50 text-orange-700' : 'text-slate-700'}`}>
                  {link.label}
                </Link>
              );
            })}
            <div className="flex items-center text-sm px-3 py-2.5 min-h-11 text-slate-500">
              <Phone size={14} className="mr-2 text-orange-500" />
              01891154443 | 01764466757
            </div>
            <button onClick={() => { cycle(); }} className="flex items-center text-sm font-semibold px-3 py-2.5 min-h-11 rounded-lg text-slate-600 w-full text-left" aria-label="Toggle theme">
              <ThemeIcon size={16} className="mr-2" /> Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </button>
            {user ? (
              <>
                <div className="px-3 py-2.5 border-t border-slate-100 mt-2 pt-3 min-h-11">
                  <p className="text-sm font-bold text-slate-900">{user.name}</p>
                  <p className="text-xs text-orange-600 font-semibold">{user.role}</p>
                </div>
                {moreItems.map(item => (
                  <Link key={item.to} href={item.to} onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg text-slate-600">
                    <item.icon size={16} className="mr-2" /> {item.label}
                  </Link>
                ))}
                <Link href="/my-bookings" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg text-slate-600">
                  <Clock size={16} className="mr-2" /> My Bookings
                </Link>
                <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg text-slate-600">
                  <Heart size={16} className="mr-2" /> Favorites
                </Link>
                <div className="flex items-center gap-3 px-3 py-2.5 min-h-11">
                  <NotificationBell />
                  {user.role === 'Admin' && <AdminNotificationBell />}
                </div>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg text-slate-600">
                  <User size={16} className="mr-2" /> Profile
                </Link>
                <Link href="/change-password" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg text-slate-600">
                  <KeyRound size={16} className="mr-2" /> Change Password
                </Link>
                <button onClick={handleLogout} className="flex items-center text-sm font-semibold px-3 py-2.5 min-h-11 rounded-lg w-full text-left text-red-600" aria-label="Log out">
                  <LogOut size={16} className="mr-2" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/policies" onClick={() => setMobileOpen(false)} className="flex items-center text-sm px-3 py-2.5 min-h-11 rounded-lg text-slate-600">
                  <ShieldCheck size={16} className="mr-2" /> Policies
                </Link>
                <div className="flex gap-2 pt-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center text-sm font-bold px-4 py-3 min-h-11 rounded-lg bg-neutral-900 text-white flex items-center justify-center">Sign In</Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)} className="flex-1 text-center text-sm font-bold px-4 py-3 min-h-11 rounded-lg bg-orange-500 text-white flex items-center justify-center">Sign Up</Link>
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
