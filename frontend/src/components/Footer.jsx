import { Link } from 'react-router-dom';
import { Bike, Phone, MapPin } from 'lucide-react';
import { memo } from 'react';

const Footer = () => (
  <footer style={{ background: 'var(--footer-bg)', borderTop: '1px solid var(--footer-border)' }}>
    <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center mb-4">
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center mr-2">
              <Bike size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-bold text-lg">Rent Bike Cox's Bazar</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--footer-text)' }}>
            Your trusted vehicle rental platform in Cox's Bazar. Bikes, cars & beach jeeps at the best prices with secure online payment.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-4 uppercase tracking-wide" style={{ color: 'var(--footer-text)' }}>Quick Links</h3>
          <ul className="space-y-2.5">
            {[
              { to: '/', label: 'Home' },
              { to: '/#vehicles', label: 'Browse Vehicles' },
              { to: '/policies', label: 'Policies' },
            ].map(link => (
              <li key={link.label}>
                <Link to={link.to} className="text-sm hover:text-cyan-400 transition-colors py-1.5" style={{ color: 'var(--footer-text)' }}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-4 uppercase tracking-wide" style={{ color: 'var(--footer-text)' }}>Contact</h3>
          <ul className="space-y-3">
            <li className="flex items-center text-sm" style={{ color: 'var(--footer-text)' }}>
              <Phone size={14} className="mr-3 text-cyan-400 flex-shrink-0" />
              01891-154443, 01764-466757
            </li>
            <li className="flex items-center text-sm" style={{ color: 'var(--footer-text)' }}>
              <MapPin size={14} className="mr-3 text-cyan-400 flex-shrink-0" />
              Cox's Bazar, Bangladesh
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--footer-border)' }}>
        <p className="text-xs" style={{ color: 'var(--footer-muted)' }}>&copy; 2026 Rent Bike Cox's Bazar. All rights reserved.</p>
        <p className="text-xs" style={{ color: 'var(--footer-muted)' }}>Built with React, Express & MongoDB</p>
      </div>
    </div>
  </footer>
);

export default memo(Footer);
