import { Calendar, DollarSign, Wrench, Clock, CheckCircle, TrendingUp } from 'lucide-react';

const HistoryStats = ({ stats }) => {
  const cards = [
    { label: 'Total Bookings', value: stats.totalBookings, icon: Calendar, color: 'var(--accent-text)', bg: 'var(--accent-bg)', border: 'var(--accent-border)' },
    { label: 'Completed', value: stats.completedBookings, icon: CheckCircle, color: 'var(--success-text)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
    { label: 'Cancelled', value: stats.cancelledBookings, icon: Clock, color: 'var(--danger-text)', bg: 'var(--danger-bg)', border: 'var(--danger-border)' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'var(--info-text)', bg: 'var(--info-bg)', border: 'var(--info-border)' },
    { label: 'Total Revenue', value: `${stats.totalRevenue.toLocaleString()} TK`, icon: DollarSign, color: 'var(--success-text)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
    { label: 'Avg/Booking', value: `${parseInt(stats.avgRevenuePerBooking).toLocaleString()} TK`, icon: DollarSign, color: 'var(--accent-text)', bg: 'var(--accent-bg)', border: 'var(--accent-border)' },
    { label: 'Maintenance Events', value: stats.totalMaintenanceEvents, icon: Wrench, color: 'var(--warning-text)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
    { label: 'Maintenance Cost', value: `${stats.totalMaintenanceCost.toLocaleString()} TK`, icon: Wrench, color: 'var(--danger-text)', bg: 'var(--danger-bg)', border: 'var(--danger-border)' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(card => (
        <div key={card.label} className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
              <card.icon size={14} style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryStats;
