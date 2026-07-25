import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { CreditCard, AlertTriangle, Tag, MapPin, Clock, CheckCircle, Loader2, Timer, Minus, Plus, RefreshCw } from 'lucide-react';
import { SkeletonPage } from '../components/ui/Skeleton';
import { useToast } from '../components/useToast';

const POLL_INTERVAL_MS = 20000;

const START_TIME_MIN_MINUTES = 10;

const formatDateTime = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const getDefaultStartTime = () => {
  const now = new Date();
  const target = new Date(now.getTime() + 30 * 60 * 1000);
  const mins = target.getMinutes();
  const remainder = mins % 15;
  if (remainder > 0) target.setMinutes(mins + (15 - remainder));
  else target.setMinutes(mins);
  target.setSeconds(0);
  target.setMilliseconds(0);
  return formatDateTime(target);
};

const addHoursToDate = (dateStr, hours) => {
  const d = new Date(dateStr);
  d.setHours(d.getHours() + hours);
  return formatDateTime(d);
};

const Checkout = () => {
  const { bikeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlHours = Math.min(720, Math.max(1, parseInt(searchParams.get('hours'), 10) || 4));
  const [bike, setBike] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [hours, setHours] = useState(urlHours);
  const [couponCode, setCouponCode] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [destination, setDestination] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [createdBookingId, setCreatedBookingId] = useState(null);
  const [timeAdjusted, setTimeAdjusted] = useState('');
  const errorRef = useRef(null);
  const pollRef = useRef(null);
  const { addToast } = useToast();
  const [isStartTooSoon, setIsStartTooSoon] = useState(false);

  useEffect(() => {
    if (!startTime) return;
    const check = () => setIsStartTooSoon(new Date(startTime).getTime() < Date.now() + START_TIME_MIN_MINUTES * 60 * 1000);
    const id = setTimeout(() => { check(); }, 0);
    const interval = setInterval(check, 15000);
    return () => { clearTimeout(id); clearInterval(interval); };
  }, [startTime]);

  const endTime = startTime && hours >= 1 ? addHoursToDate(startTime, hours) : '';

  useEffect(() => {
    api.get(`/dashboard/bikes/${bikeId}`).then(res => {
      setBike(res.data);
      setStartTime(getDefaultStartTime());
    }).catch(() => {
      setFetchError('Failed to load booking details. Please try again.');
    });
  }, [bikeId]);

  useEffect(() => {
    if (!startTime || !endTime || !bike) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setError('');
      setPreviewData(null);
      setPreviewLoading(true);
      try {
        const res = await api.post('/pricing/preview', {
          bikeId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          couponCode,
        }, { signal: controller.signal });
        setPreviewData(res.data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[Checkout] Pricing preview failed:', err);
          setError(err.response?.data?.message || 'Failed to calculate pricing');
          setPreviewData(null);
        }
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [startTime, endTime, couponCode, bikeId, bike]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  useEffect(() => {
    if (!startTime || !endTime || !bike || createdBookingId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.post('/pricing/preview', {
          bikeId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          couponCode,
        });
        setPreviewData(prev => {
          if (!prev) return res.data;
          if (prev.available !== res.data.available) {
            return res.data;
          }
          return { ...prev, pricing: res.data.pricing };
        });
      } catch { /* poll is best-effort */ }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [startTime, endTime, couponCode, bikeId, bike, createdBookingId]);

  const incrementHours = useCallback(() => {
    setHours(prev => Math.min(prev + 1, 720));
  }, []);

  const decrementHours = useCallback(() => {
    setHours(prev => Math.max(prev - 1, 1));
  }, []);

  const createBookingAndPay = async (confirmDirectly = false) => {
    if (!agreedToTerms) {
      const msg = 'Please agree to the terms and conditions before proceeding.';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    if (!pricing) {
      const msg = 'Pricing is still loading. Please wait a moment and try again.';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    if (!isAvailable) {
      const msg = previewData?.conflictMessage || 'This time slot is no longer available. Please change your start time or duration.';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    let effectiveStartTime = startTime;
    const now = new Date();
    const startMs = new Date(startTime).getTime();
    if (startMs < now.getTime() + START_TIME_MIN_MINUTES * 60 * 1000) {
      const target = new Date(now.getTime() + START_TIME_MIN_MINUTES * 60 * 1000);
      const mins = target.getMinutes();
      const remainder = mins % 15;
      if (remainder > 0) target.setMinutes(mins + (15 - remainder));
      else target.setMinutes(mins);
      target.setSeconds(0);
      effectiveStartTime = formatDateTime(target);
      setStartTime(effectiveStartTime);
      setTimeAdjusted(formatDisplayDate(effectiveStartTime));
    }

    try {
      setCreating(true);
      setError('');
      setTimeAdjusted('');
      clearInterval(pollRef.current);
      const res = await api.post('/booking', {
        bikeId,
        startTime: new Date(effectiveStartTime),
        endTime: new Date(addHoursToDate(effectiveStartTime, hours)),
        couponCode,
        destination,
      });
      const booking = res.data.booking;
      if (!booking || !booking._id) {
        throw new Error('Invalid response from server — booking not created');
      }
      setCreatedBookingId(booking._id);
      addToast('Booking created successfully!', 'success');

      if (confirmDirectly) {
        const confirmRes = await api.post('/booking/confirm', {
          bookingId: booking._id,
          amountPaid: res.data.minAdvance,
        });
        addToast('Booking confirmed!', 'success');
        navigate(`/invoice/${confirmRes.data.booking._id}`);
      } else {
        const payRes = await api.post('/payment/init', { bookingId: booking._id });
        if (payRes.data.url) {
          addToast('Redirecting to payment gateway...', 'info');
          window.location.replace(payRes.data.url);
        } else {
          const msg = 'Payment gateway unavailable. Use "Confirm Booking" for direct confirmation.';
          setError(msg);
          addToast(msg, 'error');
          setCreating(false);
        }
      }
    } catch (err) {
      console.error('[Checkout] createBookingAndPay failed:', err);
      const msg = err.response?.data?.message || 'Failed to create booking. Please try again.';
      if (msg.includes('not available') || msg.includes('conflict') || err.response?.status === 409) {
        const userMsg = 'This time slot was just booked by someone else. Please try a different start time or check other bikes.';
        setError(userMsg);
        addToast(userMsg, 'error');
      } else if (msg.includes('10 minutes') || msg.includes('start time')) {
        const userMsg = 'Start time is too soon. It has been adjusted — please try again.';
        setError(userMsg);
        addToast(userMsg, 'error');
      } else {
        setError(msg);
        addToast(msg, 'error');
      }
      setCreating(false);
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.post('/pricing/preview', {
            bikeId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            couponCode,
          });
          setPreviewData(res.data);
        } catch { /* poll is best-effort */ }
      }, POLL_INTERVAL_MS);
    }
  };

  useEffect(() => {
    if (!createdBookingId) return;
    const interval = setInterval(async () => {
      try {
        await api.post(`/booking/${createdBookingId}/heartbeat`);
      } catch { /* heartbeat is best-effort */ }
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [createdBookingId]);

  const formatDisplayDate = (dateStr) => new Date(dateStr).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });
  const pricing = previewData?.pricing;
  const isAvailable = previewData?.available !== false;

  const disabledReason = !agreedToTerms
    ? 'Please agree to the terms and conditions below to continue.'
    : !isAvailable
      ? (previewData?.conflictMessage || 'This bike was just booked by someone else for your selected time. Try a different time or check other bikes.')
      : null;
  const isDisabled = creating || !agreedToTerms || !isAvailable;

  if (fetchError) return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center glass rounded-2xl p-8 max-w-md">
        <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: 'var(--warning-text)' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Failed to Load</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{fetchError}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
      </div>
    </div>
  );
  if (!bike) return <SkeletonPage />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Checkout</h1>

      {error && (
        <div ref={errorRef} className="border p-4 rounded-2xl mb-6 text-sm flex items-start gap-2" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span>{error}</span>
            {error.includes('someone else') && (
              <Link to="/" className="block mt-2 font-semibold underline text-xs" style={{ color: 'var(--accent-text)' }}>
                Browse other bikes &rarr;
              </Link>
            )}
          </div>
          <button onClick={() => setError('')} className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--danger-text)' }}>&times;</button>
        </div>
      )}

      {timeAdjusted && !error && (
        <div className="border p-3 rounded-2xl mb-6 text-sm flex items-center gap-2" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning-text)' }}>
          <Clock size={14} className="flex-shrink-0" />
          <span>Start time adjusted to <strong>{timeAdjusted}</strong> (nearest available slot)</span>
        </div>
      )}

      <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Bike Info */}
        <div className="flex items-center gap-4 pb-5 border-b min-w-0" style={{ borderColor: 'var(--border-base)' }}>
          {bike.images?.[0] && <img src={bike.images[0]} alt={bike.model || 'Unknown'} className="w-16 h-16 rounded-xl object-cover" onError={(e) => { e.target.src = 'https://placehold.co/100x100/1a1a2e/666?text=N/A'; }} />}
          <div className="min-w-0">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{bike.model || 'Unknown'}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{bike.brand || 'Unknown'} - {bike.category?.name || 'N/A'}</p>
            <p className="font-bold text-sm mt-0.5" style={{ color: 'var(--accent-text)' }}>{bike.pricePerHour || 0} TK / Hour</p>
          </div>
        </div>

        {/* Live Availability Badge */}
        {previewData && (
          <div className="flex items-center justify-between">
            <div className={`rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 ${isAvailable ? 'border' : ''}`}
              style={isAvailable
                ? { background: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success-text)' }
                : { background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }
              }>
              {isAvailable ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
              {isAvailable ? 'Available now' : 'No longer available'}
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
              <span>Live</span>
            </div>
          </div>
        )}

        {/* Pricing Tiers Info */}
        {bike.packages?.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="font-bold mb-2 flex items-center text-sm" style={{ color: 'var(--text-primary)' }}>
              <Timer size={14} className="mr-2" style={{ color: 'var(--accent-text)' }} /> Pricing Tiers
            </h3>
            <div className="flex flex-wrap gap-2">
              {bike.packages.map((tier, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ borderColor: 'var(--border-base)', color: 'var(--text-secondary)', background: 'var(--card-bg)' }}>
                  {tier.label}: <span style={{ color: 'var(--accent-text)' }}>{tier.hourlyRate} TK/hr</span>
                </span>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Best tier auto-applied &bull; Min 150 TK/hr</p>
          </div>
        )}

        {/* Duration Selection */}
        <div>
          <label className="block text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={12} className="inline mr-1" /> How many hours do you need?
          </label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={decrementHours}
              className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all active:scale-95"
              style={{ borderColor: 'var(--border-base)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
              <Minus size={18} />
            </button>
            <div className="flex-1">
              <input type="number" min="1" max="720" value={hours}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 720) setHours(v);
                }}
                className="input-dark text-center text-2xl font-bold !py-3" />
            </div>
            <button type="button" onClick={incrementHours}
              className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all active:scale-95"
              style={{ borderColor: 'var(--border-base)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
              <Plus size={18} />
            </button>
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Minimum 1 hour &bull; Maximum 720 hours (30 days)</p>
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={12} className="inline mr-1" /> Start Time
          </label>
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-dark text-sm" />
          {isStartTooSoon && (
            <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--warning-text)' }}>
              <AlertTriangle size={11} />
              Too soon — will be auto-adjusted to the nearest available slot on submit.
            </p>
          )}
        </div>

        {/* Auto End Time Display */}
        <div className="glass rounded-xl p-4 flex items-center justify-between border" style={{ borderColor: 'var(--accent-border)' }}>
          <div className="flex items-center">
            <Clock size={16} className="mr-2" style={{ color: 'var(--accent-text)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Return Time (auto-calculated)</p>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{endTime ? formatDisplayDate(endTime) : '—'}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
            {hours}h
          </span>
        </div>

        {/* Availability Status */}
        {previewData && (
          <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${isAvailable ? 'border' : ''}`}
            style={isAvailable
              ? { background: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success-text)' }
              : { background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }
            }>
            {isAvailable ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {isAvailable ? 'Bike available for selected time' : (previewData.conflictMessage || 'This time slot was just booked by someone else. Try different hours or start time.')}
          </div>
        )}

        {/* Preview Loading */}
        {previewLoading && (
          <div className="rounded-xl p-3 text-sm font-medium flex items-center gap-2" style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>
            <Loader2 size={16} className="animate-spin" />
            Checking availability &amp; pricing...
          </div>
        )}

        {/* Coupon */}
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            <Tag size={12} className="inline mr-1" /> Coupon Code (optional)
          </label>
          <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter coupon code" className="input-dark text-sm" />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            <MapPin size={12} className="inline mr-1" /> Destination / Trip Plan
          </label>
          <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Cox's Bazar Beach, Inani, Himchari" className="input-dark text-sm" />
        </div>

        {/* Price Breakdown */}
        {pricing && (
          <>
            <div className="glass rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Total Price</span>
                <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{pricing.totalPrice} TK</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Advance Required</span>
                <span className="font-bold text-xl" style={{ color: 'var(--accent-text)' }}>{pricing.minAdvance} TK</span>
              </div>
              <div className="text-xs space-y-0.5 pt-2 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-base)' }}>
                <p className="flex items-center"><Clock size={12} className="mr-1" /> {pricing.hours} hours &bull; {formatDisplayDate(startTime)} &rarr; {endTime ? formatDisplayDate(endTime) : '—'}</p>
                {pricing.couponApplied && <p style={{ color: 'var(--success-text)' }}>Coupon: {pricing.couponApplied.code} ({pricing.couponApplied.discount}% off)</p>}
              </div>
            </div>

            {/* Terms */}
            <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--warning-border)' }}>
              <h3 className="font-bold flex items-center mb-3 text-sm" style={{ color: 'var(--warning-text)' }}>
                <AlertTriangle size={16} className="mr-2" /> Terms &amp; Conditions
              </h3>
              <ul className="text-xs space-y-1.5 mb-4" style={{ color: 'var(--text-secondary)' }}>
                <li>&bull; Petrol cost borne by the customer</li>
                <li>&bull; Beach sand: <strong style={{ color: 'var(--warning-text)' }}>1,000 TK fine</strong></li>
                <li>&bull; Lost helmet: <strong style={{ color: 'var(--warning-text)' }}>2,000 TK fine</strong></li>
                <li>&bull; Beyond Teknaf: <strong style={{ color: 'var(--warning-text)' }}>5,000 TK fine</strong></li>
                <li>&bull; Renter liable for all accidents/damage</li>
              </ul>
              <Link to="/policies" target="_blank" className="text-xs font-medium underline block mb-3" style={{ color: 'var(--accent-text)' }}>
                Read full Policies &amp; Terms
              </Link>
              <label className="flex items-start cursor-pointer min-h-12 py-2 rounded-lg transition-colors" style={{ background: agreedToTerms ? 'var(--success-bg)' : 'transparent' }}>
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 mr-3 h-5 w-5 rounded flex-shrink-0"
                  style={{ accentColor: 'var(--accent-text)', borderColor: 'var(--border-strong)' }} />
                <span className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  I have read and agree to all terms and conditions.
                </span>
              </label>
            </div>

            {/* Disabled Reason Banner */}
            {isDisabled && !creating && disabledReason && (
              <div className="rounded-xl p-3 text-sm font-medium flex items-center gap-2" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning-text)' }}>
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>{disabledReason}</span>
              </div>
            )}

            {/* Payment */}
            <div className="space-y-3">
              <button onClick={() => createBookingAndPay(false)} disabled={isDisabled}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center ${
                  isDisabled
                    ? 'cursor-not-allowed'
                    : 'gradient-primary shadow-lg shadow-amber-500/25 hover:shadow-xl hover:-translate-y-0.5'
                }`}
                style={isDisabled ? { background: 'var(--hover-bg)', color: 'var(--text-muted)' } : undefined}>
                {creating ? <Loader2 size={20} className="mr-2 animate-spin" /> : <CreditCard size={20} className="mr-2" />}
                {creating ? 'Processing...' : `Pay ${pricing.minAdvance} TK via SSLCommerz`}
              </button>
              <button onClick={() => createBookingAndPay(true)} disabled={isDisabled}
                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center border-2 ${
                  isDisabled
                    ? 'cursor-not-allowed'
                    : ''
                }`}
                style={isDisabled ? { borderColor: 'var(--border-base)', color: 'var(--text-muted)' } : { borderColor: 'var(--success-border)', color: 'var(--success-text)', background: 'var(--success-bg)' }}>
                <CheckCircle size={20} className="mr-2" />
                {creating ? 'Processing...' : `Confirm Booking (${pricing.minAdvance} TK Advance)`}
              </button>
              <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>bKash / Nagad / Bank Transfer via secure SSLCommerz gateway</p>
            </div>
          </>
        )}

        <p className="text-center text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
          Booking confirmed only after successful advance payment
        </p>
      </div>
    </div>
  );
};

export default Checkout;
