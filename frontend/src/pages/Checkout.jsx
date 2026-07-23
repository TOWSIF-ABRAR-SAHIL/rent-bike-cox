import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { CreditCard, AlertTriangle, Tag, MapPin, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { SkeletonPage } from '../components/ui/Skeleton';

const formatDateTime = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const Checkout = () => {
  const { bikeId } = useParams();
  const navigate = useNavigate();
  const [bike, setBike] = useState(null);
  const [settings, setSettings] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [destination, setDestination] = useState('');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/dashboard/bikes/${bikeId}`),
      api.get('/dashboard/settings')
    ]).then(([bikeRes, settingsRes]) => {
      setBike(bikeRes.data);
      setSettings(settingsRes.data);
      const now = new Date();
      const later = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      setStartTime(formatDateTime(now));
      setEndTime(formatDateTime(later));
    }).catch(() => setFetchError('Failed to load booking details. Please try again.'));
  }, [bikeId]);

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
        if (selectedPackage !== null) payload.packageIndex = selectedPackage;
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
  }, [startTime, endTime, couponCode, selectedPackage, bikeId, bike, destination]);

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

  const handlePackageSelect = (index) => setSelectedPackage(selectedPackage === index ? null : index);
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
  if (!bike || !settings) return <SkeletonPage />;

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

        {/* Package Selection */}
        {settings.packages?.length > 0 && (
          <div>
            <h3 className="font-bold mb-3 text-sm uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>Choose a Package</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {settings.packages.map((pkg, index) => (
                <button key={index} onClick={() => handlePackageSelect(index)}
                  className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedPackage === index
                      ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/10'
                      : 'hover:border-primary-500/50'
                  }`}
                  style={selectedPackage !== index ? { borderColor: 'var(--border-base)' } : undefined}>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{pkg.name}</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--accent-text)' }}>{pkg.price} TK</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Duration Selection */}
        {selectedPackage === null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Start Time</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-dark text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>End Time</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-dark text-sm" />
            </div>
          </div>
        )}

        {/* Selected Package Info */}
        {selectedPackage !== null && settings.packages[selectedPackage] && (
          <div className="glass p-4 rounded-xl flex items-center justify-between border border-primary-500/20">
            <div className="flex items-center">
              <CheckCircle size={18} className="text-primary-400 mr-2" />
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{settings.packages[selectedPackage].name}</span>
            </div>
            <span className="font-bold" style={{ color: 'var(--accent-text)' }}>{settings.packages[selectedPackage].price} TK</span>
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
                {selectedPackage !== null ? (
                  <p className="flex items-center"><Clock size={12} className="mr-1" /> Package: {settings.packages[selectedPackage]?.name}</p>
                ) : (
                  <p className="flex items-center flex-wrap"><Clock size={12} className="mr-1" /> {formatDisplayDate(startTime)} → {formatDisplayDate(endTime)}</p>
                )}
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
              <label className="flex items-start cursor-pointer">
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 mr-2.5 h-4 w-4 text-primary-500 rounded focus:ring-primary-500"
                  style={{ borderColor: 'var(--border-strong)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>I have read and agree to all terms and conditions.</span>
              </label>
            </div>

            {/* Payment */}
            <div className="space-y-3">
              <button onClick={handlePayment} disabled={loading || !agreedToTerms}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center ${
                  loading || !agreedToTerms
                    ? 'cursor-not-allowed'
                    : 'gradient-primary shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5'
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
