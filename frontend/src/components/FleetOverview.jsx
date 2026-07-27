import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Bike as BikeIcon, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';

const FleetOverview = ({ bikes = [] }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/my-bikes');
        const bikeList = res.data;
        const total = bikeList.length;
        const active = bikeList.filter(b => b.availability && !b.isUnderMaintenance).length;
        const unavailable = bikeList.filter(b => !b.availability && !b.isUnderMaintenance).length;
        const underMaintenance = bikeList.filter(b => b.isUnderMaintenance).length;
        const needsService = bikeList.filter(b => {
          if (!b.nextServiceDue) return false;
          return new Date(b.nextServiceDue) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        }).length;

        setStats({ total, active, unavailable, underMaintenance, needsService });
      } catch {
        setStats({ total: bikes.length, active: 0, unavailable: 0, underMaintenance: 0, needsService: 0 });
      }
    };
    fetchStats();
  }, [bikes]);

  if (!stats) return null;

  const cards = [
    { label: 'Total Vehicles', value: stats.total, icon: BikeIcon, color: 'var(--info-text)' },
    { label: 'Active', value: stats.active, icon: CheckCircle, color: 'var(--success-text)' },
    { label: 'Unavailable', value: stats.unavailable, icon: AlertTriangle, color: 'var(--warning-text)' },
    { label: 'Under Maintenance', value: stats.underMaintenance, icon: Wrench, color: 'var(--danger-text)' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map(card => (
        <div key={card.label} className="glass rounded-2xl p-4 border" style={{ borderColor: 'var(--border-base)' }}>
          <div className="flex items-center gap-2 mb-2">
            <card.icon size={16} style={{ color: card.color }} />
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default FleetOverview;
