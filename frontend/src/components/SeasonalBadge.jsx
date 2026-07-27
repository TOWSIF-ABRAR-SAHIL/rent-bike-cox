import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import api from '../api/axios';

export default function SeasonalBadge({ startTime }) {
  const [rate, setRate] = useState(null);

  useEffect(() => {
    if (!startTime) return;
    api.get('/seasonal-rates').then(({ data }) => {
      const date = new Date(startTime);
      for (const r of data) {
        if (r.type === 'weekend' && r.daysOfWeek?.includes(date.getDay())) { setRate(r); return; }
        if (r.recurringYearly && r.month && r.dayOfMonth &&
            date.getMonth() + 1 === r.month && date.getDate() === r.dayOfMonth) { setRate(r); return; }
        if (r.startDate && r.endDate && date >= new Date(r.startDate) && date <= new Date(r.endDate)) { setRate(r); return; }
      }
    }).catch(() => {});
  }, [startTime]);

  if (!rate) return null;

  const isHigher = rate.multiplier > 1;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: isHigher ? 'rgba(234, 88, 12, 0.12)' : 'rgba(16, 185, 129, 0.12)',
        color: isHigher ? '#fb923c' : '#34d399',
      }}
    >
      {isHigher ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {rate.name} ({rate.multiplier}x)
    </div>
  );
}

export function CurrentSeasonalInfo() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api.get('/seasonal-rates').then(({ data }) => {
      const now = new Date();
      for (const r of data) {
        if (r.type === 'weekend' && r.daysOfWeek?.includes(now.getDay())) { setInfo(r); return; }
        if (r.recurringYearly && r.month && r.dayOfMonth &&
            now.getMonth() + 1 === r.month && now.getDate() === r.dayOfMonth) { setInfo(r); return; }
        if (r.startDate && r.endDate && now >= new Date(r.startDate) && now <= new Date(r.endDate)) { setInfo(r); return; }
      }
    }).catch(() => {});
  }, []);

  if (!info) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
      style={{
        background: info.multiplier > 1 ? 'rgba(234, 88, 12, 0.08)' : 'rgba(16, 185, 129, 0.08)',
        color: info.multiplier > 1 ? '#fb923c' : '#34d399',
        border: `1px solid ${info.multiplier > 1 ? 'rgba(234, 88, 12, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
      }}
    >
      <Calendar size={16} />
      {info.name}: {info.multiplier}x pricing currently active
    </div>
  );
}
