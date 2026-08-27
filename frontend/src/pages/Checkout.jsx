import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { CreditCard, AlertTriangle, Tag, MapPin, Clock, CheckCircle, Loader2, ChevronRight, FileText } from 'lucide-react';
import { SkeletonPage } from '../components/ui/Skeleton';
import { useToast } from '../components/useToast';
import { useAuth } from '../context/useAuth';

const POLL_INTERVAL_MS = 20000;
const START_TIME_MIN_MINUTES = 10;

const formatDateTime = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const formatDisplayDate = (dateStr) => new Date(dateStr).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });

const Checkout = () => {
  const { bikeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;
  const { user } = useAuth();
  const { addToast } = useToast();
  const errorRef = useRef(null);
  const pollRef = useRef(null);

  const bookingData = useMemo(() => state ? {
    duration: state.duration || 4,
    startTime: state.startTime,
    endTime: state.endTime,
    pricing: state.pricing,
    bike: state.bike,
  } : null, [state]);

  const [couponCode, setCouponCode] = useState('');
  const [previewData, setPreviewData] = useState(bookingData?.pricing ? { pricing: bookingData.pricing, available: true } : null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [destination, setDestination] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [fetchError, setFetchError] = useState(bookingData ? '' : 'No booking data found. Please go back and select your booking details.');
  const [createdBookingId, setCreatedBookingId] = useState(null);
  const [bike, setBike] = useState(bookingData?.bike || null);

  useEffect(() => {
    if (bookingData || bike) return;
    api.get(`/dashboard/bikes/${bikeId}`).then(res => {
      setBike(res.data);
    }).catch(() => {
      setFetchError('Failed to load vehicle details. Please try again.');
    });
  }, [bikeId, bookingData, bike]);

  useEffect(() => {
    if (!bookingData || !bookingData.startTime || !bookingData.endTime) return;
    if (couponCode === '' && previewData) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/pricing/preview', {
          bikeId,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          couponCode: couponCode || undefined,
        }, { signal: controller.signal });
        setPreviewData(res.data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.response?.data?.message || 'Failed to calculate pricing');
          setPreviewData(null);
        }
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [bikeId, bookingData, couponCode, previewData]);

  useEffect(() => {
    if (!bookingData || createdBookingId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.post('/pricing/preview', {
          bikeId,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          couponCode: couponCode || undefined,
        });
        setPreviewData(prev => {
          if (!prev) return res.data;
          if (prev.available !== res.data.available) return res.data;
          return { ...prev, pricing: res.data.pricing };
        });
      } catch { /* poll is best-effort */ }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [bikeId, bookingData, couponCode, createdBookingId]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  useEffect(() => {
    if (!createdBookingId) return;
    const interval = setInterval(async () => {
      try {
        await api.post(`/booking/${createdBookingId}/heartbeat`);
      } catch { /* heartbeat is best-effort */ }
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [createdBookingId]);

  const pricing = previewData?.pricing;
  const isAvailable = previewData?.available !== false;

  const disabledReason = !agreedToTerms
    ? 'Please agree to the terms and conditions to continue.'
    : !isAvailable
      ? (previewData?.conflictMessage || 'This bike is no longer available for your selected time.')
      : null;
  const isDisabled = creating || !agreedToTerms || !isAvailable || !pricing;

  const createBookingAndPay = async () => {
    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions.');
      return;
    }
    if (!pricing) {
      setError('Pricing is still loading.');
      return;
    }
    if (!isAvailable) {
      setError(previewData?.conflictMessage || 'Time slot no longer available.');
      return;
    }

    let effectiveStartTime = bookingData.startTime;
    const now = new Date();
    if (new Date(effectiveStartTime).getTime() < now.getTime() + START_TIME_MIN_MINUTES * 60 * 1000) {
      const target = new Date(now.getTime() + START_TIME_MIN_MINUTES * 60 * 1000);
      const mins = target.getMinutes();
      const remainder = mins % 15;
      if (remainder > 0) target.setMinutes(mins + (15 - remainder));
      target.setSeconds(0);
      target.setMilliseconds(0);
      effectiveStartTime = formatDateTime(target);
    }

    try {
      setCreating(true);
      setError('');
      clearInterval(pollRef.current);
      const body = {
        bikeId,
        startTime: new Date(effectiveStartTime),
        endTime: new Date(bookingData.endTime),
      };
      if (couponCode) body.couponCode = couponCode;
      if (destination) body.destination = destination;
      const res = await api.post('/booking', body);
      const booking = res.data.booking;
      if (!booking || !booking._id) {
        throw new Error('Invalid response from server');
      }
      setCreatedBookingId(booking._id);
      addToast('Booking created! Redirecting to payment...', 'success');
      const payRes = await api.post('/payment/init', { bookingId: booking._id });
      if (payRes.data.url) {
        window.location.replace(payRes.data.url);
      } else {
        setError('Payment gateway unavailable. Please try again.');
        setCreating(false);
      }
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message || '';
      let userMsg;
      if (status === 401) {
        userMsg = 'Session expired, please login again.';
        setTimeout(() => navigate('/login'), 1500);
      } else if (status === 403) {
        userMsg = 'Please complete identity verification first.';
      } else if (status === 409 || serverMsg.includes('not available') || serverMsg.includes('conflict')) {
        userMsg = 'This time slot was just booked. Please go back and try a different time.';
      } else {
        userMsg = serverMsg || 'Failed to create booking. Please try again.';
      }
      setError(userMsg);
      addToast(userMsg, 'error');
      setCreating(false);
    }
  };

  if (!bookingData && fetchError) return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center glass rounded-2xl p-8 max-w-md">
        <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: 'var(--warning-text)' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Booking Data</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{fetchError}</p>
        <button onClick={() => navigate(`/bike/${bikeId}`)} className="btn-primary" aria-label="Go to vehicle page">Select Booking Details</button>
      </div>
    </div>
  );
  if (!bookingData) return <SkeletonPage />;

  const displayBike = bike || bookingData.bike;
  const duration = bookingData.duration;
  const startTime = bookingData.startTime;
  const endTime = bookingData.endTime;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <nav className="flex items-center gap-1.5 text-xs mb-4 flex-wrap" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" className="hover:underline" style={{ color: 'var(--accent-text)' }}>Home</Link>
          <ChevronRight size={12} />
          <Link to="/search" className="hover:underline" style={{ color: 'var(--accent-text)' }}>Vehicles</Link>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-secondary)' }}>{displayBike?.model || 'Vehicle'}</span>
          <ChevronRight size={12} />
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Checkout</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Complete Your Booking</h1>
        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--success-text)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success-text)' }} /> Select
          </span>
          <span className="h-px flex-1 max-w-8" style={{ background: 'var(--border-base)' }} />
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--accent-text)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-text)' }} /> Details
          </span>
          <span className="h-px flex-1 max-w-8" style={{ background: 'var(--border-base)' }} />
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: 'var(--border-base)' }} /> Payment
          </span>
        </div>
      </div>

      {error && (
        <div ref={errorRef} className="border p-4 rounded-2xl mb-6 text-sm flex items-start gap-2" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span>{error}</span>
            {error.includes('go back') && (
              <Link to={`/bike/${bikeId}`} className="block mt-2 font-semibold underline text-xs" style={{ color: 'var(--accent-text)' }}>
                Go back to vehicle &rarr;
              </Link>
            )}
          </div>
          <button onClick={() => setError('')} className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--danger-text)' }} aria-label="Close">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-8">
        {/* LEFT COLUMN — Form */}
        <div className="lg:col-span-6 space-y-6">
          {/* Customer Information */}
          <div className="glass rounded-2xl p-6" style={{ border: '1px solid var(--border-base)' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FileText size={16} style={{ color: 'var(--accent-text)' }} /> Customer Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                <input type="text" value={user?.name || ''} readOnly className="input-dark text-sm opacity-70 cursor-not-allowed" aria-label="Full name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
                  <input type="email" value={user?.email || ''} readOnly className="input-dark text-sm opacity-70 cursor-not-allowed" aria-label="Email" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Identity</label>
                  <div className="input-dark text-sm flex items-center gap-1.5" style={{ color: 'var(--success-text)' }}>
                    <CheckCircle size={14} /> Verified
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Details */}
          <div className="glass rounded-2xl p-6" style={{ border: '1px solid var(--border-base)' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <MapPin size={16} style={{ color: 'var(--accent-text)' }} /> Trip Details
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Destination / Trip Plan</label>
                <textarea value={destination} onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Cox's Bazar Beach, Inani, Himchari"
                  rows={2}
                  className="input-dark text-sm resize-none" aria-label="Destination or trip plan" />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Special Requests (optional)</label>
                <textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requirements..."
                  rows={2}
                  className="input-dark text-sm resize-none" aria-label="Special requests" />
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div className="glass rounded-2xl p-6" style={{ border: '1px solid var(--border-base)' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Tag size={16} style={{ color: 'var(--accent-text)' }} /> Coupon Code
            </h2>
            <div className="flex gap-2">
              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code" className="input-dark text-sm flex-1" aria-label="Coupon code" />
              <button onClick={() => setPreviewData(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                aria-label="Apply coupon">
                Apply
              </button>
            </div>
            {pricing?.couponApplied && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--success-text)' }}>
                <CheckCircle size={12} /> Coupon {pricing.couponApplied.code} applied (-{pricing.couponApplied.discount}%)
              </p>
            )}
          </div>

          {/* Terms */}
          <div className="glass rounded-2xl p-6" style={{ border: '1px solid var(--border-base)' }}>
            <label className="flex items-start cursor-pointer min-h-12 py-2 rounded-lg transition-colors" style={{ background: agreedToTerms ? 'var(--success-bg)' : 'transparent' }}>
              <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 mr-3 h-5 w-5 rounded flex-shrink-0"
                style={{ accentColor: 'var(--accent-text)', borderColor: 'var(--border-strong)' }} />
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                I have read and agree to the{' '}
                <Link to="/policies" target="_blank" className="font-medium underline" style={{ color: 'var(--accent-text)' }}>Terms &amp; Conditions</Link>
                {' '}and{' '}
                <Link to="/policies" target="_blank" className="font-medium underline" style={{ color: 'var(--accent-text)' }}>Rental Policy</Link>
              </span>
            </label>
          </div>

          {/* Payment Methods (informational) */}
          <div className="glass rounded-2xl p-6" style={{ border: '1px solid var(--border-base)' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <CreditCard size={16} style={{ color: 'var(--accent-text)' }} /> Payment Methods
            </h2>
            <div className="flex flex-wrap gap-2">
              {['bKash', 'Nagad', 'Bank Transfer', 'Visa', 'Mastercard'].map(method => (
                <span key={method} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-base)' }}>
                  {method}
                </span>
              ))}
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>All payments processed securely via SSLCommerz</p>
          </div>

          {/* Disabled Reason */}
          {isDisabled && !creating && disabledReason && (
            <div ref={errorRef} className="rounded-xl p-3 text-sm font-medium flex items-center gap-2" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning-text)' }}>
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{disabledReason}</span>
            </div>
          )}

          {/* Pay Button */}
          <button onClick={createBookingAndPay} disabled={isDisabled}
            className={`w-full py-4 min-h-12 rounded-xl font-bold text-white text-lg transition-all duration-300 flex items-center justify-center ${
              isDisabled
                ? 'cursor-not-allowed'
                : 'gradient-primary shadow-lg shadow-amber-500/25 hover:shadow-xl hover:-translate-y-0.5'
            }`}
            style={isDisabled ? { background: 'var(--hover-bg)', color: 'var(--text-muted)' } : undefined}
            aria-label="Pay via SSLCommerz">
            {creating ? <Loader2 size={20} className="mr-2 animate-spin" /> : <CreditCard size={20} className="mr-2" />}
            {creating ? 'Processing...' : `Pay ${pricing?.minAdvance || '...'} TK via SSLCommerz`}
          </button>
        </div>

        {/* RIGHT COLUMN — Sticky Summary */}
        <div className="lg:col-span-5">
          <div className="glass rounded-3xl p-6 space-y-5 sticky top-5" style={{ border: '1px solid var(--border-base)' }}>
            {/* Vehicle Preview */}
            <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-base)' }}>
              {displayBike?.images?.[0] && (
                <img src={displayBike.images[0]} alt={displayBike.model} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" onError={(e) => { e.target.src = 'https://placehold.co/100x100/1a1a2e/666?text=N/A'; }} />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{displayBike?.model || 'Vehicle'}</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{displayBike?.brand || ''} &bull; {displayBike?.category?.name || 'Vehicle'}</p>
              </div>
              <Link to={`/bike/${bikeId}`} className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--accent-text)' }}>
                Change
              </Link>
            </div>

            {/* Booking Details — READ ONLY */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-bg)' }}>
                  <Clock size={14} style={{ color: 'var(--accent-text)' }} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Pickup</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatDisplayDate(startTime)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-bg)' }}>
                  <Clock size={14} style={{ color: 'var(--accent-text)' }} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Return</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatDisplayDate(endTime)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-bg)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--accent-text)' }}>{duration}h</span>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Duration</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{duration} Hours</p>
                </div>
              </div>
              {destination && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-bg)' }}>
                    <MapPin size={14} style={{ color: 'var(--accent-text)' }} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Destination</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{destination}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            {pricing && (
              <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border-base)' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Rental ({duration}h &times; {pricing.hourlyRate} TK)</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{pricing.totalPrice} TK</span>
                </div>
                {pricing.couponApplied && (
                  <div className="flex justify-between text-sm" style={{ color: 'var(--success-text)' }}>
                    <span>Coupon Discount</span>
                    <span>-{pricing.couponApplied.discount}% off</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--border-base)' }}>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total Price</span>
                    <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{pricing.totalPrice} TK</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Advance Required ({pricing.advancePercent}%)</span>
                  <span className="font-bold" style={{ color: 'var(--accent-text)' }}>{pricing.minAdvance} TK</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Pay on Pickup</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{pricing.totalPrice - pricing.minAdvance} TK</span>
                </div>
              </div>
            )}

            {/* Pay Now Highlight */}
            {pricing && (
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Pay Now</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--accent-text)' }}>{pricing.minAdvance} TK</p>
              </div>
            )}

            {/* Support */}
            <div className="text-center pt-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Need help? Call <a href="tel:01891154443" className="font-medium" style={{ color: 'var(--accent-text)' }}>01891-154443</a> (24/7)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Checkout);
