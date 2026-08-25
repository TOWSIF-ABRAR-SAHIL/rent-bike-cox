import { Bike, Wrench, AlertTriangle, Activity, DollarSign, Calendar, BarChart3 } from 'lucide-react';

const FleetSummary = ({ summary }) => {
  const cards = [
    { label: 'Total Vehicles', value: summary.totalBikes, icon: Bike, color: 'var(--accent-text)', bg: 'var(--accent-bg)', border: 'var(--accent-border)' },
    { label: 'Active', value: summary.activeBikes, icon: Activity, color: 'var(--success-text)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
    { label: 'Under Maintenance', value: summary.maintenanceBikes, icon: Wrench, color: 'var(--warning-text)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
    { label: 'Unavailable', value: summary.unavailableBikes, icon: AlertTriangle, color: 'var(--danger-text)', bg: 'var(--danger-bg)', border: 'var(--danger-border)' },
    { label: 'Bookings (Month)', value: summary.bookingsThisMonth, icon: Calendar, color: 'var(--accent-text)', bg: 'var(--accent-bg)', border: 'var(--accent-border)' },
    { label: 'Revenue (Month)', value: `${(summary.revenueThisMonth ?? 0).toLocaleString()} TK`, icon: DollarSign, color: 'var(--success-text)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
    { label: 'Active Bookings', value: summary.activeBookings, icon: BarChart3, color: 'var(--info-text)', bg: 'var(--info-bg)', border: 'var(--info-border)' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="p-4 rounded-xl transition-all hover:scale-[1.02]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FleetSummary;
