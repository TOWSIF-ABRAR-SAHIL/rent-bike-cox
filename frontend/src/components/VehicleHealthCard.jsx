import { Wrench, AlertTriangle, CheckCircle } from 'lucide-react';

const VehicleHealthCard = ({ bike }) => {
  const now = new Date();
  const isOverdue = bike.nextServiceDue && new Date(bike.nextServiceDue) < now;
  const isDueSoon = bike.nextServiceDue && !isOverdue && new Date(bike.nextServiceDue) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const conditionColors = {
    excellent: { bg: 'var(--success-bg)', text: 'var(--success-text)', border: 'var(--success-border)' },
    good: { bg: 'var(--info-bg, rgba(59,130,246,0.1))', text: 'var(--info-text, #3b82f6)', border: 'var(--info-border, rgba(59,130,246,0.2))' },
    fair: { bg: 'var(--warning-bg)', text: 'var(--warning-text)', border: 'var(--warning-border)' },
    poor: { bg: 'var(--danger-bg)', text: 'var(--danger-text)', border: 'var(--danger-border)' },
  };

  const condition = conditionColors[bike.condition] || conditionColors.good;

  return (
    <div className="glass rounded-xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bike.brand} {bike.model}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {bike.currentMileage ? `${bike.currentMileage.toLocaleString()} km` : 'No mileage data'}
          </p>
        </div>
        <span className="px-2 py-1 rounded-lg text-xs font-medium border capitalize" style={{ background: condition.bg, color: condition.text, borderColor: condition.border }}>
          {bike.condition || 'Good'}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {bike.isUnderMaintenance && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
            <Wrench size={12} className="text-amber-500" />
            <span className="text-amber-500 font-medium">Under Maintenance</span>
          </div>
        )}

        {isOverdue && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
            <AlertTriangle size={12} className="text-red-500" />
            <span className="text-red-500 font-medium">Service Overdue</span>
          </div>
        )}

        {isDueSoon && !isOverdue && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle size={12} className="text-amber-500" />
            <span className="text-amber-500">Service Due Soon</span>
          </div>
        )}

        {!bike.isUnderMaintenance && !isOverdue && !isDueSoon && (
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--success-bg)' }}>
            <CheckCircle size={12} style={{ color: 'var(--success-text)' }} />
            <span style={{ color: 'var(--success-text)' }}>Healthy</span>
          </div>
        )}

        {bike.lastServiceDate && (
          <p style={{ color: 'var(--text-muted)' }}>Last service: {new Date(bike.lastServiceDate).toLocaleDateString()}</p>
        )}
        {bike.nextServiceDue && (
          <p style={{ color: isOverdue ? 'var(--danger-text)' : 'var(--text-muted)' }}>
            Next service: {new Date(bike.nextServiceDue).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default VehicleHealthCard;
