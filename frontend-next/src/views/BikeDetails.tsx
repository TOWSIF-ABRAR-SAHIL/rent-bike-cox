"use client";
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { setNavState } from '../lib/navState';
import type { Bike, Review, ReviewStats } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ChevronLeft, ChevronRight, AlertTriangle, Heart, GitCompareArrows, Expand, PenLine, Star, Users, Zap, Fuel, Gauge, ShieldCheck, AlertCircle, MapPin, Share2, Check, ChevronDown, BadgeCheck } from 'lucide-react';
import Lightbox from '../components/Lightbox';
import BookingWidget from '../components/BookingWidget';
import SafeImage from '../components/SafeImage';
import VehicleCard from '../components/VehicleCard';
import dynamic from 'next/dynamic';

// Leaflet touches `window` at import — same dynamic pattern as Home.tsx.
const ZoneTeaserMap = dynamic(() => import('../components/ZoneTeaserMap'), { ssr: false });
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import { useCompare } from '../context/useCompare';
import { useWishlist } from '../context/useWishlist';
import { SkeletonPage } from '../components/ui/Skeleton';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import { resolveImages, getBikeSpecs } from '../lib/bikeMedia';
import { getSavedPickupLocation } from '../lib/pickupSpots';

const SPEC_ICON: Record<string, LucideIcon> = {
  Capacity: Users,
  Type: Zap,
  Fuel: Fuel,
  Engine: Gauge,
};

const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'What documents do I need to rent?', a: 'Original NID and a valid driving license are required at pickup for verification. The renter must be present with the documents.' },
  { q: 'Is fuel included in the rental price?', a: 'No — petrol cost is borne by the customer. Bikes are handed over with a noted fuel level; please return at the same level.' },
  { q: 'What if I return the vehicle late?', a: 'Extra hours are billed at the vehicle\u2019s standard hourly rate. If you need more time, extend from My Bookings or call support before your return time.' },
  { q: 'What happens if the bike is damaged?', a: 'The renter is liable for accidents and damage during the rental. Penalty charges apply for beach-sand entry (1,000 TK), lost helmet (2,000 TK) and trips beyond Teknaf (5,000 TK).' },
];

const CANCELLATION_ROWS: { k: string; v: string }[] = [
  { k: '24+ hours before pickup', v: 'Full refund' },
  { k: '12–24 hours before pickup', v: '50% refund' },
  { k: 'Under 12 hours / no-show', v: 'No refund' },
];

const Stars = ({ value, size = 14 }: { value: number; size?: number }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${value} out of 5`}>
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} size={size} fill={s <= Math.round(value) ? '#f59e0b' : 'none'} color={s <= Math.round(value) ? '#f59e0b' : '#cbd5e1'} />
    ))}
  </span>
);

/** Prefetched by `app/bike/[id]/page.tsx`; `null` means no prefetch (or the API
 *  was unreachable) and the view fetches on the client as it always did. */
interface BikeDetailsProps {
  initialBike?: Bike | null;
  initialReviews?: Review[] | null;
  initialReviewStats?: ReviewStats | null;
  initialReviewPages?: number | null;
}

const BikeDetails = ({ initialBike = null, initialReviews = null, initialReviewStats = null, initialReviewPages = null }: BikeDetailsProps = {}) => {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [bike, setBike] = useState<Bike | null>(initialBike);
  const [loading, setLoading] = useState(initialBike === null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [fetchError, setFetchError] = useState('');
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(initialReviewStats);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(initialReviewPages ?? 1);
  const [reviewSort, setReviewSort] = useState('newest');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [recommended, setRecommended] = useState<Bike[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  const { toggle: toggleCompare, has: hasCompare } = useCompare();
  const { toggle: toggleWishlist, has: hasWish } = useWishlist();

  // Skip only the first fetch of each resource: the server already rendered that
  // exact query. Sorting, paginating, retry and post-review refetches still run.
  const seeded = useRef({
    bike: initialBike !== null,
    reviews: initialReviews !== null,
  });

  const fetchReviews = useCallback(async (page = 1) => {
    try {
      setReviewLoading(true);
      const sortParam = reviewSort === 'oldest' ? 'oldest' : reviewSort === 'highest' ? 'highest' : reviewSort === 'lowest' ? 'lowest' : 'newest';
      const { data } = await api.get(`/reviews/${id}?page=${page}&limit=5&sort=${sortParam}`);
      setReviews(data.reviews);
      setReviewStats(data.stats);
      setReviewPage(data.page);
      setReviewPages(data.pages);
    } catch {
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  }, [id, reviewSort]);

  useEffect(() => {
    if (seeded.current.reviews) { seeded.current.reviews = false; return; }
    fetchReviews(1);
  }, [fetchReviews]);

  const handleReviewSubmit = async ({ rating, title, comment }: { rating: number; title: string; comment: string }): Promise<void> => {
    try {
      await api.post(`/reviews/${id}`, { rating, title, comment });
      fetchReviews(1);
      setShowReviewForm(false);
    } catch {
      // review submit failed silently
    }
  };

  const fetchBike = useCallback(() => {
    setLoading(true);
    setFetchError('');
    api.get(`/dashboard/bikes/${id}`).then(res => {
      setBike(res.data);
    }).catch(() => {
      setFetchError('Failed to load vehicle details. Please try again.');
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (seeded.current.bike) { seeded.current.bike = false; return; }
    fetchBike();
  }, [fetchBike]);

  useEffect(() => {
    if (!bike) return;
    const params: Record<string, string> = {};
    const category = bike.category;
    if (category && typeof category !== 'string' && category._id) {
      params.category = category._id;
    }
    api.get('/dashboard/bikes/available', { params })
      .then(res => {
        const recs = (res.data as Bike[]).filter((b: Bike) => b._id !== bike._id).slice(0, 3);
        setRecommended(recs);
      })
      .catch(() => {});
  }, [bike]);

  const handleProceed = ({ duration, startTime, endTime, pricing }: {
    duration: number; startTime: string | Date; endTime: string | Date; pricing: unknown;
  }): void => {
    if (!bike) return;
    if (!token) { router.push('/login'); return; }
    setNavState('checkout', {
      duration,
      startTime,
      endTime,
      pricing,
      pickupLocation: getSavedPickupLocation(),
      bike: {
        model: bike.model,
        brand: bike.brand,
        images: bike.images,
        category: bike.category,
        pricePerHour: bike.pricePerHour,
      },
    });
    router.push(`/checkout/${id}`);
  };

  if (loading) return <SkeletonPage />;
  if (fetchError) return (
    <div className="bg-[#f4f6fa] min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center bg-white border border-slate-200 rounded-2xl p-8 max-w-md">
        <AlertTriangle size={40} className="mx-auto mb-4 text-amber-500" />
        <h2 className="text-xl font-black text-slate-900 mb-2">Failed to Load</h2>
        <p className="text-sm text-slate-500 mb-4">{fetchError}</p>
        <button onClick={() => fetchBike()} className="btn-primary" aria-label="Reload page">Try Again</button>
      </div>
    </div>
  );
  if (!bike) return (
    <div className="bg-[#f4f6fa] min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center bg-white border border-slate-200 rounded-2xl p-8 max-w-md">
        <AlertTriangle size={40} className="mx-auto mb-4 text-amber-500" />
        <h2 className="text-xl font-black text-slate-900 mb-2">Vehicle Not Found</h2>
        <p className="text-sm text-slate-500 mb-4">The vehicle you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <button onClick={() => router.back()} className="btn-primary" aria-label="Go back">Go Back</button>
      </div>
    </div>
  );

  const images = resolveImages(bike);
  const mainImage = images[0];
  const specs = getBikeSpecs(bike);

  const avgRating = reviewStats?.avgRating ? Number(reviewStats.avgRating) : 0;
  const totalReviews = reviewStats?.total || 0;

  const wishActive = bike ? hasWish(bike._id) : false;
  const compareActive = bike ? hasCompare(bike._id) : false;

  const categoryName = bike && typeof bike.category !== 'string' ? bike.category?.name : undefined;
  const zoneName = bike && typeof bike.zone !== 'string' ? (bike.zone as { name?: string } | undefined)?.name : undefined;
  const renterName = bike && typeof bike.renter !== 'string' ? bike.renter?.name : undefined;
  const savedSpot = bike ? getSavedPickupLocation() : '';

  const shareListing = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  const headerActions = (
    <>
      <button onClick={() => toggleWishlist(bike!._id)}
        className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center transition-all active:scale-95 shadow-sm"
        style={{ borderColor: wishActive ? '#ef4444' : '#e2e8f0', color: wishActive ? '#ef4444' : '#64748b' }}
        aria-label={wishActive ? 'Remove from favorites' : 'Add to favorites'}
        title={wishActive ? 'Saved' : 'Save'}>
        <Heart size={18} fill={wishActive ? '#ef4444' : 'none'} />
      </button>
      <button onClick={() => toggleCompare(bike!)}
        className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center transition-all active:scale-95 shadow-sm"
        style={{ borderColor: compareActive ? '#f97316' : '#e2e8f0', color: compareActive ? '#f97316' : '#64748b' }}
        aria-label={compareActive ? 'Remove from comparison' : 'Add to comparison'}
        title={compareActive ? 'Comparing' : 'Compare'}>
        <GitCompareArrows size={18} />
      </button>
      <button onClick={shareListing}
        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center transition-all active:scale-95 shadow-sm text-slate-500"
        aria-label="Copy listing link" title={copied ? 'Link copied!' : 'Share'}>
        {copied ? <Check size={18} className="text-teal-600" /> : <Share2 size={18} />}
      </button>
    </>
  );

  return (
    <div className="bg-[#f4f6fa] animate-fade-in">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <button onClick={() => router.back()} className="flex items-center text-sm mb-5 transition-colors min-h-11 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-800" aria-label="Go back">
        <ArrowLeft size={16} className="mr-1" /> Back
      </button>

      {/* Title header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{bike.model}</h1>
            {bike.isVerified && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1">
                <BadgeCheck size={13} /> Verified
              </span>
            )}
            {bike.isUnderMaintenance ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                <AlertTriangle size={13} /> Under Maintenance
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1">
                <Check size={13} /> Available Now
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{bike.brand} &bull; {categoryName || 'Vehicle'}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Stars value={avgRating} />
              <b className="text-slate-900">{avgRating ? avgRating.toFixed(1) : '0.0'}</b>
              <span className="text-slate-500">({totalReviews} reviews)</span>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-500 text-[13px]">
              <MapPin size={13} /> {savedSpot || zoneName || 'Cox\u2019s Bazar'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">{headerActions}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
        {/* LEFT COLUMN — Scrollable Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 aspect-[4/3] relative group">
              <SafeImage src={mainImage} alt={bike.model ?? ''} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" eager />
              <button onClick={() => { setLightboxIndex(selectedImage); setLightboxOpen(true); }}
                className="absolute top-3 right-3 w-10 h-10 bg-white/95 shadow rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 text-slate-700"
                aria-label="Open fullscreen gallery">
                <Expand size={18} />
              </button>
              {images.length > 1 && (
                <>
                  <button onClick={() => setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/95 shadow rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-slate-700">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/95 shadow rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-slate-700">
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`rounded-xl overflow-hidden aspect-square border-2 transition-all bg-white relative ${selectedImage === i ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-slate-200 hover:border-orange-500/50'}`}>
                    <SafeImage src={src} alt={`${bike.model ?? 'Vehicle'} image ${i + 1}`} fill sizes="200px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Key Specs — 4 Item Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {specs.map((spec, i) => {
              const Icon = SPEC_ICON[spec.label] || Gauge;
              return (
                <div key={i} className="bg-white rounded-xl p-4 text-center border border-slate-200">
                  <Icon size={20} className="mx-auto mb-1.5 text-orange-500" />
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{spec.label}</p>
                  <p className="text-sm font-bold mt-0.5 text-slate-900">{spec.value}</p>
                </div>
              );
            })}
          </div>

          {/* Description */}
          {bike.description && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
              <h2 className="text-lg font-black text-slate-900 mb-2">Description</h2>
              <p className="leading-relaxed text-sm text-slate-600">{bike.description}</p>
            </div>
          )}

          {/* Video */}
          {bike.videoUrl && (() => {
            try {
              const url = new URL(bike.videoUrl);
              const allowedHosts = ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'vimeo.com'];
              if (!allowedHosts.includes(url.hostname)) return null;
              return (
                <div className="rounded-2xl overflow-hidden bg-white border border-slate-200">
                  <div className="relative aspect-video flex items-center justify-center bg-slate-100">
                    <iframe src={bike.videoUrl} className="w-full h-full" allowFullScreen title="Vehicle video" sandbox="allow-presentation" />
                  </div>
                </div>
              );
            } catch {
              return null;
            }
          })()}

          {/* Requirements & Rules */}
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
            <h3 className="font-bold flex items-center mb-3 text-sm text-amber-800">
              <ShieldCheck size={16} className="mr-2" /> Requirements &amp; Rules
            </h3>
            <ul className="text-sm space-y-2 text-slate-600">
              <li className="flex items-start"><CheckItem /> Original NID and Driving License required</li>
              <li className="flex items-start"><CheckItem /> Minimum advance payment (50% short-term, 30% long-term)</li>
              <li className="flex items-start"><CheckItem /> Petrol cost borne by the customer</li>
              <li className="flex items-start"><CheckItem /> Max 2 persons per bike</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-amber-200">
              <p className="text-xs font-bold flex items-center gap-1 mb-2 text-amber-800">
                <AlertCircle size={12} /> Penalty Charges
              </p>
              <ul className="text-xs space-y-1 text-slate-600">
                <li>Beach sand entry: <strong className="text-red-600">1,000 TK fine</strong></li>
                <li>Lost helmet: <strong className="text-red-600">2,000 TK fine</strong></li>
                <li>Beyond Teknaf: <strong className="text-red-600">5,000 TK fine</strong></li>
                <li>Renter liable for all accidents/damage</li>
              </ul>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <h2 className="text-lg font-black text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="divide-y divide-slate-100">
              {FAQ_ITEMS.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={i}>
                    <button onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full flex items-center justify-between gap-3 py-3.5 text-left min-h-11"
                      aria-expanded={open}>
                      <span className="text-sm font-bold text-slate-800">{item.q}</span>
                      <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && <p className="text-sm text-slate-600 leading-relaxed pb-4 pr-6">{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <h2 className="text-lg font-black text-slate-900 mb-1">Cancellation Policy</h2>
            <p className="text-xs text-slate-500 mb-4">Full policy: <Link href="/policies" className="font-semibold text-orange-600 hover:underline">Rental Policies</Link></p>
            <div className="space-y-2">
              {CANCELLATION_ROWS.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                  <span className="text-slate-600">{row.k}</span>
                  <span className={`font-bold shrink-0 ${i === 0 ? 'text-teal-700' : i === 1 ? 'text-amber-700' : 'text-red-600'}`}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pickup Zones */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <h2 className="text-lg font-black text-slate-900 mb-1">Pickup Zones</h2>
            <p className="text-xs text-slate-500 mb-4">
              {savedSpot ? <>Your selected pickup: <b className="text-slate-800">{savedSpot}</b> — change it from the homepage search.</> : 'Choose a pickup spot in the homepage search; it is saved to your booking.'}
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-200 h-72">
              <ZoneTeaserMap />
            </div>
          </div>

          {/* Listed By */}
          {renterName && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <span className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-black shrink-0">
                {renterName.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  {renterName} <BadgeCheck size={15} className="text-teal-600" />
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Verified vehicle owner — contact details are shared after booking.</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Sticky Booking Widget (dark card: widget uses theme vars built for dark) */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6 lg:self-start rounded-3xl bg-[#0d0d12] p-3 sm:p-4">
            <BookingWidget bike={bike} token={token} onProceed={handleProceed} hideHeader />
          </div>
        </div>
      </div>

      {/* Reviews — dark band so the existing review components sit on their native theme */}
      <div className="mt-6 rounded-3xl bg-[#0d0d12] p-5 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">Ratings &amp; Reviews</h2>
            <div className="flex items-center gap-1 text-sm">
              <Stars value={avgRating} />
              <span className="font-bold text-white">{avgRating ? avgRating.toFixed(1) : '0.0'}</span>
              <span className="text-xs text-slate-400">({totalReviews} reviews)</span>
            </div>
          </div>
          {token && (
            <button onClick={() => setShowReviewForm(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{
                background: 'var(--accent-bg)',
                color: 'var(--accent-text)',
                border: '1px solid var(--accent-border)',
              }}
              aria-label="Write a review">
              <PenLine size={15} /> Write a Review
            </button>
          )}
        </div>

        {showReviewForm && (
          <div className="mb-6 animate-fade-in">
            <ReviewForm onSubmit={handleReviewSubmit} loading={reviewLoading} />
          </div>
        )}

        {reviewLoading && reviews.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border border-white/10 bg-white/5 text-slate-400">
            <p className="text-sm">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border border-white/10 bg-white/5">
            <Star size={28} className="mx-auto mb-3 text-slate-500" />
            <p className="text-sm text-slate-400">
              No reviews yet. Be the first to rent and review this vehicle!
            </p>
          </div>
        ) : (
          <ReviewList
            stats={reviewStats ?? { avgRating: 0, total: 0 }}
            reviews={reviews}
            page={reviewPage}
            pages={reviewPages}
            onPageChange={fetchReviews}
            sort={reviewSort}
            onSortChange={setReviewSort}
          />
        )}
      </div>

      {/* You May Be Interested In */}
      {recommended.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-slate-900">
              You May Be Interested In
            </h2>
            <Link href="/search" className="text-sm font-bold text-orange-600 hover:underline shrink-0">View all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {recommended.map(rec => (
              <VehicleCard key={rec._id} bike={rec} />
            ))}
          </div>
        </div>
      )}

      {lightboxOpen && images.length > 0 && (
        <Lightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}
      </div>
    </div>
  );
};

const CheckItem = () => (
  <span className="mr-2 mt-0.5 flex-shrink-0 text-teal-600 font-bold">&#10003;</span>
);

export default memo(BikeDetails);
