import { DollarSign, TrendingUp, ArrowDownRight, Shield, Percent, RotateCcw } from 'lucide-react';

const FinancialSummary = ({ data }) => {
  const totalRevenue = data.totalRevenue ?? 0;
  const totalAdvanceCollected = data.totalAdvanceCollected ?? 0;
  const totalRemainingCollected = data.totalRemainingCollected ?? 0;
  const netRevenue = data.netRevenue ?? 0;
  const totalSecurityDeposits = data.totalSecurityDeposits ?? 0;
  const totalRefunds = data.totalRefunds ?? 0;
  const refundCount = data.refundCount ?? 0;
  const collectionRate = data.collectionRate ?? 0;
  const refundRate = data.refundRate ?? 0;

  const cards = [
    { label: 'Total Revenue', value: `${totalRevenue.toLocaleString()} TK`, icon: DollarSign, color: 'var(--accent-text)', bg: 'var(--accent-bg)' },
    { label: 'Advance Collected', value: `${totalAdvanceCollected.toLocaleString()} TK`, icon: TrendingUp, color: 'var(--success-text)', bg: 'var(--success-bg)' },
    { label: 'Remaining Collected', value: `${totalRemainingCollected.toLocaleString()} TK`, icon: ArrowDownRight, color: 'var(--info-text)', bg: 'var(--info-bg)' },
    { label: 'Net Revenue', value: `${netRevenue.toLocaleString()} TK`, icon: DollarSign, color: netRevenue >= 0 ? 'var(--success-text)' : 'var(--danger-text)', bg: netRevenue >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)' },
    { label: 'Security Deposits', value: `${totalSecurityDeposits.toLocaleString()} TK`, icon: Shield, color: 'var(--purple-text)', bg: 'var(--purple-bg)' },
    { label: 'Total Refunds', value: `${totalRefunds.toLocaleString()} TK (${refundCount})`, icon: RotateCcw, color: 'var(--danger-text)', bg: 'var(--danger-bg)' },
    { label: 'Collection Rate', value: `${collectionRate}%`, icon: Percent, color: 'var(--success-text)', bg: 'var(--success-bg)' },
    { label: 'Refund Rate', value: `${refundRate}%`, icon: Percent, color: refundRate > 10 ? 'var(--danger-text)' : 'var(--text-muted)', bg: refundRate > 10 ? 'var(--danger-bg)' : 'var(--input-bg)' },
  ];

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <DollarSign size={16} /> Financial Summary
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(card => (
          <div key={card.label} className="p-3 rounded-lg" style={{ background: 'var(--input-bg)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <card.icon size={13} style={{ color: card.color }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</span>
            </div>
            <p className="text-sm font-bold" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinancialSummary;
