import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Wrench, Clock, History } from 'lucide-react';
import PageSpinner from './PageSpinner';

const VehicleHistory = lazy(() => import('../pages/VehicleHistory'));

const conditionColors = {
  excellent: { text: 'var(--success-text)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
  good: { text: 'var(--info-text)', bg: 'var(--info-bg)', border: 'var(--info-border)' },
  fair: { text: 'var(--warning-text)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
  poor: { text: 'var(--danger-text)', bg: 'var(--danger-bg)', border: 'var(--danger-border)' },
};

const FleetBikeRow = ({ bike, selected, onToggle }) => {
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const colors = conditionColors[bike.condition] || conditionColors.good;

  const statusLabel = bike.isUnderMaintenance ? 'Maintenance' : bike.availability ? 'Active' : 'Unavailable';
  const statusColor = bike.isUnderMaintenance
    ? { text: 'var(--warning-text)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' }
    : bike.availability
      ? { text: 'var(--success-text)', bg: 'var(--success-bg)', border: 'var(--success-border)' }
      : { text: 'var(--danger-text)', bg: 'var(--danger-bg)', border: 'var(--danger-border)' };

  if (showHistory) {
    return (
      <div className="col-span-full">
        <Suspense fallback={<PageSpinner />}>
          <VehicleHistory bikeId={bike._id} onClose={() => setShowHistory(false)} />
        </Suspense>
      </div>
    );
  }

  return (
    <div
      className="px-4 py-3 flex items-center gap-4 cursor-pointer transition-all"
      style={{ background: selected ? 'var(--accent-bg)' : 'var(--bg-card)' }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--hover-bg)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-card)'; }}
    >
      {onToggle && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(bike._id)}
          onClick={e => e.stopPropagation()}
          className="w-4 h-4 rounded accent-amber-500 flex-shrink-0"
        />
      )}
      <div
        className="flex items-center gap-4 flex-1 min-w-0"
        onClick={() => navigate(`/bike/${bike._id}`)}
      >
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--border-base)' }}>
          {bike.images?.[0] ? (
            <img src={bike.images[0]} alt={bike.model} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>N/A</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{bike.brand} {bike.model}</p>
            {bike.zone && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-base)' }}>
                <MapPin size={10} />
                {bike.zone.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.category?.name || 'N/A'}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.pricePerHour} TK/hr</span>
            {bike.currentMileage > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.currentMileage} km</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {bike.activeBooking && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
              <Clock size={10} />
              Rented
            </span>
          )}
          {bike.nextMaintenanceDue && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
              <Wrench size={10} />
              Due
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
            {statusLabel}
          </span>
          <span className="text-xs px-2 py-1 rounded-md" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
            {bike.condition}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
            className="p-1.5 rounded-lg transition-all hover:scale-110"
            style={{ color: 'var(--text-muted)', background: 'var(--input-bg)' }}
            title="View history"
          >
            <History size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FleetBikeRow;
