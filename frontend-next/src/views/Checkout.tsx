"use client";
import { useState, useEffect, useMemo, useRef, memo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { takeNavState } from '../lib/navState';
import api, { type ApiError } from '../api/axios';
import type { Bike, PricingInfo } from '@/types';
import { CreditCard, AlertTriangle, Tag, MapPin, Clock, CheckCircle, Loader2, ChevronRight, FileText } from 'lucide-react';
import { SkeletonPage } from '../components/ui/Skeleton';
import { useToast } from '../components/useToast';
import { useAuth } from '../context/useAuth';
import SafeImage from '../components/SafeImage';
import { PICKUP_SPOTS, getSavedPickupLocation, savePickupLocation } from '../lib/pickupSpots';

const POLL_INTERVAL_MS = 20000;
const START_TIME_MIN_MINUTES = 10;

interface CheckoutRouteState {
  duration?: number;
  startTime?: string | Date;
  endTime?: string | Date;
  pricing?: PricingInfo;
  pickupLocation?: string;
  bike?: Bike | null;
}

interface BookingData {
  duration: number;
  startTime?: string | Date;
  endTime?: string | Date;
  pricing?: PricingInfo;
  pickupLocation: string;
  bike?: Bike | null;
}

interface PreviewData {
  pricing?: PricingInfo;
  available?: boolean;
  conflictMessage?: string;
  couponError?: string;
}

const formatDateTime = (date: string | Date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const formatDisplayDate = (dateStr: string | Date) => new Date(dateStr).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });

// Light-theme form primitives (page is always light, like Home/Search/Details).
const cardCls = 'bg-white rounded-2xl border border-slate-200 p-5 sm:p-6';
const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500 transition-all min-h-11';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-slate-500';
const sectionTitleCls = 'text-sm font-black mb-4 flex items-center gap-2 text-slate-900';

const Checkout = () => {
  const { bikeId } = useParams();
  const router = useRouter();
  // One-shot navigation state (replaces react-router location.state).
  const [routeState] = useState(() => takeNavState<CheckoutRouteState>('checkout'));
  const state = routeState;
  const { user } = useAuth();
  const { addToast } = useToast();
  const errorRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bookingData: BookingData | null = useMemo(() => state ? {
    duration: state.duration || 4,
    startTime: state.startTime,
    endTime: state.endTime,
    pricing: state.pricing,
    pickupLocation: state.pickupLocation || '',
    bike: state.bike,
  } : null, [state]);

  const [couponCode, setCouponCode] = useState('');
  const [previewData, setPreviewData] = useState<PreviewData | null>(bookingData?.pricing ? { pricing: bookingData.pricing, available: true } : null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [destination, setDestination] = useState('');
  const [pickupLocation, setPickupLocation] = useState(() => bookingData?.pickupLocation || getSavedPickupLocation());
  const [specialRequests, setSpecialRequests] = useState('');
  const [fetchError, setFetchError] = useState(bookingData ? '' : 'No booking data found. Please go back and select your booking details.');
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [bike, setBike] = useState<Bike | null>(bookingData?.bike || null);

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
        const apiErr = err as ApiError;
        if (apiErr.name !== 'AbortError') {
          const data = apiErr.response?.data as { message?: string } | undefined;
          setError(data?.message || 'Failed to calculate pricing');
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
    return () => { if (pollRef.current) if (pollRef.current) clearInterval(pollRef.current); };
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

  const createBookingAndPay = async (): Promise<void> => {
    if (!bookingData) {
      setError('No booking data found. Please go back and select your booking details.');
      return;
    }
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

    const rawStart = bookingData.startTime;
    let effectiveStartTime: string =
      typeof rawStart === 'string' ? rawStart : rawStart instanceof Date ? formatDateTime(rawStart) : '';
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
      if (pollRef.current) clearInterval(pollRef.current);
      const body: {
        bikeId: string | string[] | undefined;
        startTime: Date;
        endTime: Date;
        couponCode?: string;
        destination?: string;
        pickupLocation?: string;
      } = {
        bikeId,
        startTime: new Date(effectiveStartTime),
        endTime: new Date(bookingData.endTime ?? ''),
      };
      if (couponCode) body.couponCode = couponCode;
      if (destination) body.destination = destination;
      if (pickupLocation) {
        body.pickupLocation = pickupLocation;
        savePickupLocation(pickupLocation);
      }
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
      const apiErr = err as ApiError;
      const status = apiErr.response?.status;
      const data = apiErr.response?.data as { message?: string } | undefined;
      const serverMsg = data?.message || '';
      let userMsg;
      if (status === 401) {
        userMsg = 'Session expired, please login again.';
        setTimeout(() => router.push('/login'), 1500);
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
    <div className="bg-[#f4f6fa] min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center bg-white border border-slate-200 rounded-2xl p-8 max-w-md">
        <AlertTriangle size={40} className="mx-auto mb-4 text-amber-500" />
        <h2 className="text-xl font-black mb-2 text-slate-900">No Booking Data</h2>
        <p className="text-sm mb-4 text-slate-500">{fetchError}</p>
        <button onClick={() => router.push(`/bike/${bikeId}`)} className="btn-primary" aria-label="Go to vehicle page">Select Booking Details</button>
      </div>
    </div>
  );
  if (!bookingData) return <SkeletonPage />;

  const displayBike = bike || bookingData.bike;
  const duration = bookingData.duration;
  const startTime = bookingData.startTime;
  const endTime = bookingData.endTime;

  return (
    <div className="bg-[#f4f6fa] animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <nav className="flex items-center gap-1.5 text-xs mb-4 flex-wrap text-slate-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline text-orange-600 font-semibold">Home</Link>
          <ChevronRight size={12} />
          <Link href="/search" className="hover:underline text-orange-600 font-semibold">Vehicles</Link>
          <ChevronRight size={12} />
          <span className="text-slate-500">{displayBike?.model || 'Vehicle'}</span>
          <ChevronRight size={12} />
          <span className="font-bold text-slate-900">Checkout</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Complete Your Booking</h1>
        <ol className="flex items-center gap-2 sm:gap-3 mt-4" aria-label="Checkout progress">
          {['Select', 'Details', 'Payment'].map((label, i) => {
            const done = i < 2;
            const current = i === 2;
            return (
              <li key={label} className="flex items-center gap-2 sm:gap-3">
                {i > 0 && <span className={`h-px w-6 sm:w-8 ${done ? 'bg-teal-500' : 'bg-slate-200'}`} />}
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                  done ? 'bg-teal-500 text-white' : current ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                  {done ? '✓' : i + 1}
                </span>
                <span className={`text-xs font-bold ${done ? 'text-teal-700' : current ? 'text-orange-600' : 'text-slate-400'}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {error && (
        <div ref={errorRef} className="border border-red-200 bg-red-50 text-red-700 p-4 rounded-2xl mb-6 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span>{error}</span>
            {error.includes('go back') && (
              <Link href={`/bike/${bikeId}`} className="block mt-2 font-bold underline text-xs text-orange-600">
                Go back to vehicle &rarr;
              </Link>
            )}
          </div>
          <button onClick={() => setError('')} className="text-xs font-black flex-shrink-0 text-red-700" aria-label="Close">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 lg:gap-8">
        {/* LEFT COLUMN — Form */}
        <div className="lg:col-span-6 space-y-5">
          {/* Customer Information */}
          <div className={cardCls}>
            <h2 className={sectionTitleCls}>
              <FileText size={16} className="text-orange-500" /> Customer Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" value={user?.name || ''} readOnly className={`${inputCls} opacity-70 cursor-not-allowed bg-slate-50`} aria-label="Full name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={user?.email || ''} readOnly className={`${inputCls} opacity-70 cursor-not-allowed bg-slate-50`} aria-label="Email" />
                </div>
                <div>
                  <label className={labelCls}>Identity</label>
                  <div className="px-3 py-2.5 rounded-xl text-sm min-h-11 flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 font-bold">
                    <CheckCircle size={14} /> Verified
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Details */}
          <div className={cardCls}>
            <h2 className={sectionTitleCls}>
              <MapPin size={16} className="text-orange-500" /> Trip Details
            </h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="checkout-pickup" className={labelCls}>Pickup Location</label>
                <select id="checkout-pickup" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)}
                  className={inputCls} aria-label="Pickup location">
                  <option value="">Anywhere in Cox&apos;s Bazar</option>
                  {PICKUP_SPOTS.map(spot => (
                    <option key={spot} value={spot}>{spot}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Destination / Trip Plan</label>
                <textarea value={destination} onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Cox's Bazar Beach, Inani, Himchari"
                  rows={2}
                  className={`${inputCls} resize-none`} aria-label="Destination or trip plan" />
              </div>
              <div>
                <label className={labelCls}>Special Requests (optional)</label>
                <textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requirements..."
                  rows={2}
                  className={`${inputCls} resize-none`} aria-label="Special requests" />
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div className={cardCls}>
            <h2 className={`${sectionTitleCls} !mb-3`}>
              <Tag size={16} className="text-orange-500" /> Coupon Code
            </h2>
            <div className="flex gap-2">
              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code" className={`${inputCls} flex-1 uppercase`} aria-label="Coupon code" />
              <button onClick={() => setPreviewData(null)}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all bg-orange-500 hover:bg-orange-600 text-white"
                aria-label="Apply coupon">
                Apply
              </button>
            </div>
            {pricing?.couponApplied && (
              <p className="text-xs mt-2 flex items-center gap-1 font-bold text-teal-700">
                <CheckCircle size={12} /> Coupon {pricing.couponApplied.code} applied (-{pricing.couponApplied.discount}%)
              </p>
            )}
            {couponCode !== '' && previewData?.couponError && !pricing?.couponApplied && (
              <p className="text-xs mt-2 flex items-center gap-1 font-bold text-red-600">
                <AlertTriangle size={12} /> {previewData.couponError}
              </p>
            )}
          </div>

          {/* Terms */}
          <div className={cardCls}>
            <label className={`flex items-start cursor-pointer min-h-12 py-2 px-3 -mx-3 rounded-xl transition-colors ${agreedToTerms ? 'bg-teal-50' : ''}`}>
              <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 mr-3 h-5 w-5 rounded flex-shrink-0 accent-orange-500" />
              <span className="text-sm leading-relaxed text-slate-800">
                I have read and agree to the{' '}
                <Link href="/policies" target="_blank" className="font-bold underline text-orange-600">Terms &amp; Conditions</Link>
                {' '}and{' '}
                <Link href="/policies" target="_blank" className="font-bold underline text-orange-600">Rental Policy</Link>
              </span>
            </label>
          </div>

          {/* Payment Methods (informational) */}
          <div className={cardCls}>
            <h2 className={`${sectionTitleCls} !mb-3`}>
              <CreditCard size={16} className="text-orange-500" /> Payment Methods
            </h2>
            <div className="flex flex-wrap gap-2">
              {['bKash', 'Nagad', 'Bank Transfer', 'Visa', 'Mastercard'].map(method => (
                <span key={method} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
                  {method}
                </span>
              ))}
            </div>
            <p className="text-[11px] mt-2 text-slate-400">All payments processed securely via SSLCommerz</p>
          </div>

          {/* Disabled Reason */}
          {isDisabled && !creating && disabledReason && (
            <div ref={errorRef} className="rounded-xl p-3 text-sm font-bold flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{disabledReason}</span>
            </div>
          )}

          {/* Pay Button */}
          <button onClick={createBookingAndPay} disabled={isDisabled}
            className={`w-full py-4 min-h-12 rounded-xl font-bold text-white text-lg transition-all duration-300 flex items-center justify-center ${
              isDisabled
                ? 'cursor-not-allowed bg-slate-200 !text-slate-400'
                : 'gradient-primary shadow-lg shadow-amber-500/25 hover:shadow-xl hover:-translate-y-0.5'
            }`}
            aria-label="Pay via SSLCommerz">
            {creating ? <Loader2 size={20} className="mr-2 animate-spin" /> : <CreditCard size={20} className="mr-2" />}
            {creating ? 'Processing...' : `Pay ${pricing?.minAdvance || '...'} TK via SSLCommerz`}
          </button>
        </div>

        {/* RIGHT COLUMN — Sticky Summary */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 sticky top-5 shadow-sm">
            {/* Vehicle Preview */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative bg-slate-100">
                <SafeImage src={displayBike?.images?.[0]} alt={displayBike?.model ?? ''} fill sizes="128px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-slate-900 truncate">{displayBike?.model || 'Vehicle'}</h3>
                <p className="text-xs text-slate-500">{displayBike?.brand || ''} &bull; {(typeof displayBike?.category === 'string' ? undefined : displayBike?.category?.name) || 'Vehicle'}</p>
              </div>
              <Link href={`/bike/${bikeId}`} className="text-xs font-bold flex-shrink-0 text-orange-600 hover:underline">
                Change
              </Link>
            </div>

            {/* Booking Details — READ ONLY */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Pickup</p>
                  <p className="text-sm font-bold text-slate-900">{formatDisplayDate(startTime ?? '')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Return</p>
                  <p className="text-sm font-bold text-slate-900">{formatDisplayDate(endTime ?? '')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-orange-600">{duration}h</span>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Duration</p>
                  <p className="text-sm font-bold text-slate-900">{duration} Hours</p>
                </div>
              </div>
              {pickupLocation && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={14} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Pickup Location</p>
                    <p className="text-sm font-bold text-slate-900">{pickupLocation}</p>
                  </div>
                </div>
              )}
              {destination && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={14} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Destination</p>
                    <p className="text-sm font-bold text-slate-900">{destination}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            {pricing && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Rental ({duration}h &times; {pricing.hourlyRate} TK)</span>
                  <span className="font-bold text-slate-900">{pricing.totalPrice} TK</span>
                </div>
                {pricing.couponApplied && (
                  <div className="flex justify-between text-sm font-bold text-teal-700">
                    <span>Coupon Discount</span>
                    <span>-{pricing.couponApplied.discount}% off</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-slate-900">Total Price</span>
                    <span className="text-lg font-black text-slate-900">{pricing.totalPrice} TK</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Advance Required ({Math.round((pricing.advancePercent ?? 0) * 100)}%)</span>
                  <span className="font-black text-orange-600">{pricing.minAdvance} TK</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Pay on Pickup</span>
                  <span className="font-bold text-slate-900">{(pricing.totalPrice ?? 0) - (pricing.minAdvance ?? 0)} TK</span>
                </div>
              </div>
            )}

            {/* Pay Now Highlight */}
            {pricing && (
              <div className="rounded-xl p-4 text-center bg-orange-500">
                <p className="text-xs uppercase tracking-wide mb-1 font-bold text-orange-100">Pay Now</p>
                <p className="text-2xl font-black text-white">{pricing.minAdvance} TK</p>
              </div>
            )}

            {/* Support */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Need help? Call <a href="tel:01891154443" className="font-bold text-orange-600">01891-154443</a> (24/7)
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default memo(Checkout);
