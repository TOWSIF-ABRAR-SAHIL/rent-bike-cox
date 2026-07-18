import { Link } from 'react-router-dom';
import { Bike, Phone, MapPin } from 'lucide-react';

const Footer = () => (
  <footer className="bg-[#0a0a0f] border-t border-white/5">
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
          <p className="text-gray-400 text-sm leading-relaxed">
            Your trusted vehicle rental platform in Cox's Bazar. Bikes, cars & beach jeeps at the best prices with secure online payment.
          </p>
        </div>

        <div>
          <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Quick Links</h3>
          <ul className="space-y-2.5">
            {[
              { to: '/', label: 'Home' },
              { to: '/', label: 'Browse Vehicles' },
              { to: '/policies', label: 'Policies' },
            ].map(link => (
              <li key={link.label}>
                <Link to={link.to} className="text-gray-400 text-sm hover:text-cyan-400 transition-colors">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Contact</h3>
          <ul className="space-y-3">
            <li className="flex items-center text-gray-400 text-sm">
              <Phone size={14} className="mr-3 text-cyan-400 flex-shrink-0" />
              01891-154443, 01764-466757
            </li>
            <li className="flex items-center text-gray-400 text-sm">
              <MapPin size={14} className="mr-3 text-cyan-400 flex-shrink-0" />
              Cox's Bazar, Bangladesh
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-gray-500 text-xs">&copy; 2026 Rent Bike Cox's Bazar. All rights reserved.</p>
        <p className="text-gray-600 text-xs">Built with React, Express & MongoDB</p>
      </div>
    </div>
  </footer>
);

export default Footer;
