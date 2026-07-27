import { useState, useEffect } from 'react';
import api from '../api/axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BUFFER_MS = 30 * 60 * 1000;

function isSlotOverlapping(slotStart, slotEnd, dateStart, dateEnd, buffer) {
  const s = new Date(slotStart).getTime() - buffer;
  const e = new Date(slotEnd).getTime() + buffer;
  return s < dateEnd && e > dateStart;
}

function isSlotOverlappingNoBuffer(slotStart, slotEnd, dateStart, dateEnd) {
  return new Date(slotStart).getTime() < dateEnd && new Date(slotEnd).getTime() > dateStart;
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  return { firstDay, totalDays };
}

const DayCell = ({ day, year, month, bookedSlots, maintenanceSlots, selectedRange, onDayClick }) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const date = new Date(year, month, day, 12, 0, 0);
  const dateStart = date.getTime();
  const dateEnd = dateStart + 24 * 60 * 60 * 1000;
  const isPast = date < now;

  const isBooked = bookedSlots.some(s => isSlotOverlapping(s.start, s.end, dateStart, dateEnd, BUFFER_MS));
  const isMaintenance = maintenanceSlots.some(s => isSlotOverlappingNoBuffer(s.start, s.end, dateStart, dateEnd));

  let isSelected = false;
  if (selectedRange?.start) {
    const startStr = new Date(selectedRange.start).toDateString();
    if (date.toDateString() === startStr) isSelected = true;
    if (selectedRange.end) {
      const endStr = new Date(selectedRange.end).toDateString();
      if (date.toDateString() === endStr) isSelected = true;
      const s = new Date(selectedRange.start).getTime();
      const e = new Date(selectedRange.end).getTime();
      if (dateStart > s && dateStart < e) isSelected = true;
    }
  }

  const disabled = isPast || isBooked || isMaintenance;
  let bg = '';
  let cls = '';
  if (isSelected) { bg = 'rgba(245,158,11,0.2)'; cls = 'font-bold'; }
  else if (isBooked) { bg = 'rgba(239,68,68,0.1)'; cls = 'line-through'; }
  else if (isMaintenance) { bg = 'rgba(249,115,22,0.1)'; }
  else if (isPast) { cls = 'opacity-40'; }

  let tip = 'Available';
  if (isPast) tip = 'Past date';
  else if (isBooked) tip = 'Booked';
  else if (isMaintenance) tip = 'Under maintenance';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onDayClick(date)}
      title={tip}
      className={`h-10 rounded-lg text-sm font-medium transition-all relative ${cls} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-amber-500/10'}`}
      style={{ background: bg || undefined, color: isSelected ? '#f59e0b' : 'var(--text-primary)' }}
    >
      {day}
      {(isBooked || isMaintenance) && !isPast && (
        <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isBooked ? 'bg-red-500' : 'bg-orange-500'}`} />
      )}
    </button>
  );
};

const AvailabilityCalendar = ({ bikeId, onDateSelect, selectedRange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedSlots, setBookedSlots] = useState([]);
  const [maintenanceSlots, setMaintenanceSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  useEffect(() => {
    let cancelled = false;
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const from = new Date(year, month, 1).toISOString();
        const to = new Date(year, month + 2, 0, 23, 59, 59).toISOString();
        const res = await api.get(`/availability/bike/${bikeId}?from=${from}&to=${to}`);
        if (!cancelled) {
          setBookedSlots(res.data.bookedSlots || []);
          setMaintenanceSlots(res.data.maintenanceSlots || []);
        }
      } catch {
        if (!cancelled) { setBookedSlots([]); setMaintenanceSlots([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (bikeId) fetchAvailability();
    return () => { cancelled = true; };
  }, [bikeId, year, month]);

  const handleDayClick = (date) => {
    if (onDateSelect) onDateSelect(date);
  };

  const { firstDay, totalDays } = getCalendarDays(year, month);

  return (
    <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--border-base)' }}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-2 rounded-lg transition-all hover:bg-amber-500/10" style={{ color: 'var(--text-secondary)' }}>
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
          {MONTHS[month]} {year}
        </h3>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-2 rounded-lg transition-all hover:bg-amber-500/10" style={{ color: 'var(--text-secondary)' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(d => (
          <div key={d} className="h-8 flex items-center justify-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--hover-bg)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="h-10" />)}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            return (
              <DayCell
                key={day}
                day={day}
                year={year}
                month={month}
                bookedSlots={bookedSlots}
                maintenanceSlots={maintenanceSlots}
                selectedRange={selectedRange}
                onDayClick={handleDayClick}
              />
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Available
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Booked
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          Maintenance
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
