import { Users, UserPlus, Repeat, DollarSign } from 'lucide-react';

const CustomerInsights = ({ data }) => {
  const cards = [
    { label: 'Total Customers', value: data.totalCustomers, icon: Users, color: 'var(--accent-text)', bg: 'var(--accent-bg)' },
    { label: 'New Customers', value: data.newCustomers, icon: UserPlus, color: 'var(--success-text)', bg: 'var(--success-bg)' },
    { label: 'Active Customers', value: data.activeCustomers, icon: Repeat, color: 'var(--info-text)', bg: 'var(--info-bg)' },
    { label: 'Repeat Rate', value: `${data.repeatRate}%`, icon: Repeat, color: 'var(--warning-text)', bg: 'var(--warning-bg)' },
    { label: 'Avg Spend', value: `${data.avgSpendPerCustomer.toLocaleString()} TK`, icon: DollarSign, color: 'var(--success-text)', bg: 'var(--success-bg)' },
  ];

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Customer Insights</h3>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {cards.map(card => (
          <div key={card.label} className="p-3 rounded-lg" style={{ background: 'var(--input-bg)' }}>
            <div className="flex items-center gap-2 mb-1">
              <card.icon size={14} style={{ color: card.color }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {data.topSpenders.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Top Spenders</p>
          <div className="space-y-2">
            {data.topSpenders.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--input-bg)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>{s.totalSpent.toLocaleString()} TK</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.bookings} bookings</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerInsights;
