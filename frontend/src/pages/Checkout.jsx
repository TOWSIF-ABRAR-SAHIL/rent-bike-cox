import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { CreditCard, AlertTriangle, Tag, MapPin, Clock, CheckCircle, Loader2, Timer, Minus, Plus } from 'lucide-react';
import { SkeletonPage } from '../components/ui/Skeleton';

const formatDateTime = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const addHoursToDate = (dateStr, hours) => {
  const d = new Date(dateStr);
  d.setHours(d.getHours() + hours);
  return formatDateTime(d);
};

const Checkout = () => {
  const { bikeId } = useParams();
  const navigate = useNavigate();
  const [bike, setBike] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [hours, setHours] = useState(4);
  const [couponCode, setCouponCode] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [destination, setDestination] = useState('');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    api.get(`/dashboard/bikes/${bikeId}`).then(res => {
      setBike(res.data);
      const now = new Date();
      setStartTime(formatDateTime(now));
    }).catch(() => {
      setFetchError('Failed to load booking details. Please try again.');
    });
  }, [bikeId]);

  const endTime = startTime && hours >= 1 ? addHoursToDate(startTime, hours) : '';

  const incrementHours = useCallback(() => {
    setHours(prev => Math.min(prev + 1, 720));
  }, []);

  const decrementHours = useCallback(() => {
    setHours(prev => Math.max(prev - 1, 1));
  }, []);

  useEffect(() => {
    if (!startTime || !endTime || !bike) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setError('');
      try {
        const payload = {
          bikeId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          couponCode,
          destination
        };
        const res = await api.post('/booking', payload, { signal: controller.signal });
        setBookingData(res.data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.response?.data?.message || 'Failed to create booking');
          setBookingData(null);
        }
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [startTime, endTime, couponCode, bikeId, bike, destination]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/payment/init', { bookingId: bookingData.booking._id });
      if (response.data.url) {
        window.location.replace(response.data.url);
      } else {
        setError('Payment gateway unavailable. Use "Confirm Booking" below for direct confirmation.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment initialization failed');
      setLoading(false);
    }
  };

  const handleDirectConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/booking/confirm', {
        bookingId: bookingData.booking._id,
        amountPaid: bookingData.minAdvance
      });
      navigate(`/invoice/${response.data.booking._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Confirmation failed');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bookingData?.booking?._id) return;
    const interval = setInterval(async () => {
      try {
        await api.post(`/booking/${bookingData.booking._id}/heartbeat`);
      } catch { /* heartbeat is best-effort */ }
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [bookingData?.booking?._id]);

  const formatDisplayDate = (dateStr) => new Date(dateStr).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });

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
        <div className="border p-4 rounded-2xl mb-6 text-sm" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
          {error}
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
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Best tier auto-applied • Min 150 TK/hr</p>
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
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Minimum 1 hour • Maximum 720 hours (30 days)</p>
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={12} className="inline mr-1" /> Start Time
          </label>
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-dark text-sm" />
        </div>

        {/* Auto End Time Display */}
        <div className="glass rounded-xl p-4 flex items-center justify-between border" style={{ borderColor: 'var(--accent-border)' }}>
          <div className="flex items-center">
            <Clock size={16} className="mr-2" style={{ color: 'var(--accent-text)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Return Time (auto-calculated)</p>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatDisplayDate(endTime)}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
            {hours}h
          </span>
        </div>

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
        {bookingData && (
          <>
            <div className="glass rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Total Price</span>
                <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{bookingData.booking.totalPrice} TK</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Advance Required</span>
                <span className="font-bold text-xl" style={{ color: 'var(--accent-text)' }}>{bookingData.minAdvance} TK</span>
              </div>
              <div className="text-xs space-y-0.5 pt-2 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-base)' }}>
                <p className="flex items-center"><Clock size={12} className="mr-1" /> {hours} hours • {formatDisplayDate(startTime)} → {formatDisplayDate(endTime)}</p>
                {couponCode && <p style={{ color: 'var(--success-text)' }}>Coupon: {couponCode} applied</p>}
              </div>
            </div>

            {/* Terms */}
            <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--warning-border)' }}>
              <h3 className="font-bold flex items-center mb-3 text-sm" style={{ color: 'var(--warning-text)' }}>
                <AlertTriangle size={16} className="mr-2" /> Terms & Conditions
              </h3>
              <ul className="text-xs space-y-1.5 mb-4" style={{ color: 'var(--text-secondary)' }}>
                <li>• Petrol cost borne by the customer</li>
                <li>• Beach sand: <strong style={{ color: 'var(--warning-text)' }}>1,000 TK fine</strong></li>
                <li>• Lost helmet: <strong style={{ color: 'var(--warning-text)' }}>2,000 TK fine</strong></li>
                <li>• Beyond Teknaf: <strong style={{ color: 'var(--warning-text)' }}>5,000 TK fine</strong></li>
                <li>• Renter liable for all accidents/damage</li>
              </ul>
              <Link to="/policies" target="_blank" className="text-xs font-medium underline block mb-3" style={{ color: 'var(--accent-text)' }}>
                Read full Policies & Terms
              </Link>
              <label className="flex items-start cursor-pointer min-h-11 py-1">
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 mr-2.5 h-5 w-5 text-amber-500 rounded focus:ring-amber-500 flex-shrink-0"
                  style={{ borderColor: 'var(--border-strong)' }} />
                <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>I have read and agree to all terms and conditions.</span>
              </label>
            </div>

            {/* Payment */}
            <div className="space-y-3">
              <button onClick={handlePayment} disabled={loading || !agreedToTerms}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center ${
                  loading || !agreedToTerms
                    ? 'cursor-not-allowed'
                    : 'gradient-primary shadow-lg shadow-amber-500/25 hover:shadow-xl hover:-translate-y-0.5'
                }`}
                style={loading || !agreedToTerms ? { background: 'var(--hover-bg)', color: 'var(--text-muted)' } : undefined}>
                {loading ? <Loader2 size={20} className="mr-2 animate-spin" /> : <CreditCard size={20} className="mr-2" />}
                {loading ? 'Processing...' : `Pay ${bookingData.minAdvance} TK via SSLCommerz`}
              </button>
              <button onClick={handleDirectConfirm} disabled={loading || !agreedToTerms}
                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center border-2 ${
                  loading || !agreedToTerms
                    ? 'cursor-not-allowed'
                    : ''
                }`}
                style={loading || !agreedToTerms ? { borderColor: 'var(--border-base)', color: 'var(--text-muted)' } : { borderColor: 'var(--success-border)', color: 'var(--success-text)', background: 'var(--success-bg)' }}>
                <CheckCircle size={20} className="mr-2" />
                {loading ? 'Processing...' : `Confirm Booking (${bookingData.minAdvance} TK Advance)`}
              </button>
              <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>bKash / Nagad / Bank Transfer via secure SSLCommerz gateway</p>
              {!agreedToTerms && bookingData && (
                <p className="text-xs text-center" style={{ color: 'var(--danger-text)' }}>Please agree to terms to proceed</p>
              )}
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
