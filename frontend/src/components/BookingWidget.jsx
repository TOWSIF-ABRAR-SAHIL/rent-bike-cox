import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Clock, CheckCircle, AlertTriangle, Minus, Plus, Loader2, Star, Shield, Phone, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

const formatDateTime = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const getDefaultStartTime = () => {
  const now = new Date();
  const target = new Date(now.getTime() + 60 * 60 * 1000);
  const mins = target.getMinutes();
  const remainder = mins % 15;
  if (remainder > 0) target.setMinutes(mins + (15 - remainder));
  target.setSeconds(0);
  target.setMilliseconds(0);
  return formatDateTime(target);
};

const formatDisplayDate = (dateStr) => new Date(dateStr).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });

const BookingWidget = ({ bike, token, onProceed, headerActions }) => {
  const [duration, setDuration] = useState(1);
  const [startTime, setStartTime] = useState(() => getDefaultStartTime());
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const controllerRef = useRef(null);

  const endTime = startTime && duration >= 1 ? (() => {
    const d = new Date(startTime);
    d.setHours(d.getHours() + duration);
    return formatDateTime(d);
  })() : '';

  useEffect(() => {
    if (!token || !startTime || !endTime || !bike?._id) return;
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await api.post('/pricing/preview', {
          bikeId: bike._id,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
        }, { signal: controller.signal });
        setPreviewData(res.data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setPreviewData(null);
        }
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [startTime, endTime, bike?._id, token]);

  const incrementDuration = useCallback(() => {
    setDuration(prev => Math.min(prev + 1, 720));
  }, []);

  const decrementDuration = useCallback(() => {
    setDuration(prev => Math.max(prev - 1, 1));
  }, []);

  const pricing = previewData?.pricing;
  const isAvailable = previewData?.available !== false;

  const handleProceed = () => {
    if (!token) return;
    if (!pricing || !isAvailable) return;
    onProceed({
      duration,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      pricing,
    });
  };

  const rating = bike.rating || {};
  const avgRating = rating.avgRating ?? rating.average ?? 0;
  const totalReviews = rating.total ?? rating.count ?? 0;

  const bikeFeatures = [
    bike.engine && { label: 'Engine', value: bike.engine },
    bike.mileage && { label: 'Mileage', value: `${bike.mileage} km/L` },
    { label: 'Capacity', value: `${bike.capacity || 2} Persons` },
  ].filter(Boolean);

  return (
    <div className="glass rounded-3xl p-6 space-y-5" style={{ border: '1px solid var(--border-base)' }}>
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{bike.model}</h1>
          {headerActions && (
            <div className="flex items-center gap-1.5 flex-shrink-0">{headerActions}</div>
          )}
        </div>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{bike.brand} &bull; {bike.category?.name || 'Vehicle'}</p>
        <div className="mt-2">
          {bike.isUnderMaintenance ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
              <AlertTriangle size={12} /> Under Maintenance
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }}>
              <CheckCircle size={12} /> Available Now
            </span>
          )}
        </div>
      </div>

      {/* Price + Rating */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{bike.pricePerHour || 0}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>TK / hour</span>
        </div>
        {avgRating > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Star size={14} fill="var(--accent-text)" stroke="var(--accent-text)" />
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{avgRating.toFixed(1)}</span>
            <span style={{ color: 'var(--text-muted)' }}>({totalReviews})</span>
          </div>
        )}
      </div>

      {/* Feature Badges */}
      {bikeFeatures.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bikeFeatures.map((f, i) => (
            <span key={i} className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-base)' }}>
              {f.label}: {f.value}
            </span>
          ))}
        </div>
      )}

      {/* Pricing Tiers */}
      {bike.packages?.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)' }}>
          <h3 className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Pricing Tiers</h3>
          <div className="space-y-1.5">
            {bike.packages.map((tier, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-primary)' }}>{tier.label}</span>
                <span className="font-bold" style={{ color: 'var(--accent-text)' }}>{tier.hourlyRate} TK/hr</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>Best tier auto-applied based on duration</p>
        </div>
      )}

      {/* Duration Selector */}
      <div>
        <label className="block text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          <Clock size={12} className="inline mr-1" /> How many hours?
        </label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={decrementDuration} disabled={duration <= 1}
            className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all active:scale-95 disabled:opacity-40"
            style={{ borderColor: 'var(--border-base)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} aria-label="Decrease hours">
            <Minus size={18} />
          </button>
          <div className="flex-1">
            <input type="number" min="1" max="720" value={duration}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1 && v <= 720) setDuration(v);
              }}
              className="input-dark text-center text-2xl font-bold !py-3" aria-label="Duration in hours" />
          </div>
          <button type="button" onClick={incrementDuration} disabled={duration >= 720}
            className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all active:scale-95 disabled:opacity-40"
            style={{ borderColor: 'var(--border-base)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} aria-label="Increase hours">
            <Plus size={18} />
          </button>
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Min 1 hour &bull; Max 30 days</p>
      </div>

      {/* Start Time */}
      <div>
        <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          <Clock size={12} className="inline mr-1" /> Pickup Date &amp; Time
        </label>
        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-dark text-sm" aria-label="Pickup date and time" />
      </div>

      {/* Return Time */}
      {endTime && (
        <div className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)' }}>
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Return</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatDisplayDate(endTime)}</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
            {duration}h
          </span>
        </div>
      )}

      {/* Availability Status */}
      {previewData && (
        <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${isAvailable ? '' : ''}`}
          style={isAvailable
            ? { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }
            : { background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }
          }>
          {isAvailable ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {isAvailable ? 'Bike available for selected time' : (previewData.conflictMessage || 'Not available — try different time')}
        </div>
      )}

      {/* Preview Loading */}
      {previewLoading && (
        <div className="rounded-xl p-3 text-sm font-medium flex items-center gap-2" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
          <Loader2 size={16} className="animate-spin" />
          Checking availability &amp; pricing...
        </div>
      )}

      {/* Live Price Calculation */}
      {pricing && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Duration</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{pricing.hours} hours</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Rate</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{pricing.hourlyRate} TK/hr{pricing.packageName ? ` (${pricing.packageName})` : ''}</span>
          </div>
          {pricing.couponApplied && (
            <div className="flex justify-between text-sm" style={{ color: 'var(--success-text)' }}>
              <span>Coupon: {pricing.couponApplied.code}</span>
              <span>-{pricing.couponApplied.discount}% off</span>
            </div>
          )}
          <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--border-base)' }}>
            <div className="flex justify-between">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total Price</span>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{pricing.totalPrice} TK</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Advance ({pricing.advancePercent}%):</span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>{pricing.minAdvance} TK</span>
            </div>
          </div>
        </div>
      )}

      {/* CTA Button */}
      <button onClick={handleProceed} disabled={!token || !pricing || !isAvailable || previewLoading}
        className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-300 flex items-center justify-center min-h-12 ${
          !token || !pricing || !isAvailable || previewLoading
            ? 'cursor-not-allowed'
            : 'gradient-primary shadow-lg shadow-amber-500/25 hover:shadow-xl hover:-translate-y-0.5'
        }`}
        style={!token || !pricing || !isAvailable || previewLoading ? { background: 'var(--hover-bg)', color: 'var(--text-muted)' } : undefined}
        aria-label="Proceed to checkout">
        {token ? 'Proceed to Checkout \u2192' : 'Login to Book'}
      </button>

      {/* Trust Signals */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-base)' }}>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Shield size={13} style={{ color: 'var(--success-text)' }} /> Secure payment
          </span>
          <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Phone size={13} style={{ color: 'var(--accent-text)' }} /> 01891-154443
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Star size={13} fill="var(--accent-text)" style={{ color: 'var(--accent-text)' }} /> {avgRating ? avgRating.toFixed(1) : '0.0'} rating
          </span>
          <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <ShieldCheck size={13} style={{ color: 'var(--info-text)' }} /> NID + License required
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(BookingWidget);
