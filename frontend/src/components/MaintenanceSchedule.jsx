import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Calendar, Wrench, AlertTriangle, Clock } from 'lucide-react';

const MaintenanceSchedule = ({ bikes = [] }) => {
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const bikeList = bikes.length > 0 ? bikes : (await api.get('/dashboard/my-bikes')).data;
        const now = new Date();
        const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const schedule = bikeList
          .filter(b => b.nextServiceDue && new Date(b.nextServiceDue) <= twoWeeks)
          .map(b => ({
            ...b,
            daysUntil: Math.ceil((new Date(b.nextServiceDue) - now) / (1000 * 60 * 60 * 24)),
            isOverdue: new Date(b.nextServiceDue) < now,
          }))
          .sort((a, b) => new Date(a.nextServiceDue) - new Date(b.nextServiceDue));

        setUpcoming(schedule);
      } catch {
        setUpcoming([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUpcoming();
  }, [bikes]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6" style={{ borderColor: 'var(--border-base)' }}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 rounded w-48" style={{ background: 'var(--hover-bg)' }} />
          <div className="h-10 rounded" style={{ background: 'var(--hover-bg)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--border-base)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} style={{ color: 'var(--accent-text)' }} />
        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Upcoming Maintenance</h3>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No upcoming maintenance scheduled</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map(bike => (
            <div key={bike._id} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: 'var(--border-base)', background: 'var(--card-bg)' }}>
              <div className="flex items-center gap-3">
                {bike.isOverdue ? (
                  <AlertTriangle size={16} className="text-red-500" />
                ) : bike.daysUntil <= 3 ? (
                  <Clock size={16} className="text-amber-500" />
                ) : (
                  <Wrench size={16} style={{ color: 'var(--text-muted)' }} />
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bike.brand} {bike.model}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {bike.isOverdue ? 'OVERDUE' : `Due in ${bike.daysUntil} days`}
                    {' — '}
                    {new Date(bike.nextServiceDue).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${bike.isOverdue ? 'bg-red-500/10 text-red-500' : bike.daysUntil <= 3 ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>
                {bike.isOverdue ? 'Overdue' : bike.daysUntil <= 3 ? 'Soon' : 'Scheduled'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaintenanceSchedule;
