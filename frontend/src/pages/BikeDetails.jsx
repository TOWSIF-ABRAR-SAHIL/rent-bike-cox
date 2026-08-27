import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, AlertTriangle, Heart, GitCompareArrows, Expand, PenLine, Star, Users, Zap, Fuel, Gauge, ShieldCheck, AlertCircle } from 'lucide-react';
import Lightbox from '../components/Lightbox';
import BookingWidget from '../components/BookingWidget';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import { useCompare } from '../context/useCompare';
import { useWishlist } from '../context/useWishlist';
import { SkeletonPage } from '../components/ui/Skeleton';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import { resolveImages, getBikeSpecs } from '../lib/bikeMedia';

const SPEC_ICON = {
  Capacity: Users,
  Type: Zap,
  Fuel: Fuel,
  Engine: Gauge,
};

const BikeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [bike, setBike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [fetchError, setFetchError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);
  const [reviewSort, setReviewSort] = useState('newest');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [recommended, setRecommended] = useState([]);

  const { toggle: toggleCompare, has: hasCompare } = useCompare();
  const { toggle: toggleWishlist, has: hasWish } = useWishlist();

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews(1);
  }, [fetchReviews]);

  const handleReviewSubmit = async ({ rating, title, comment }) => {
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchBike(); }, [fetchBike]);

  useEffect(() => {
    if (!bike) return;
    const params = {};
    if (bike.category?._id) params.category = bike.category._id;
    api.get('/dashboard/bikes/available', { params })
      .then(res => {
        const recs = res.data.filter(b => b._id !== bike._id).slice(0, 3);
        setRecommended(recs);
      })
      .catch(() => {});
  }, [bike]);

  const handleProceed = ({ duration, startTime, endTime, pricing }) => {
    if (!token) { navigate('/login'); return; }
    navigate(`/checkout/${id}`, {
      state: {
        duration,
        startTime,
        endTime,
        pricing,
        bike: {
          model: bike.model,
          brand: bike.brand,
          images: bike.images,
          category: bike.category,
          pricePerHour: bike.pricePerHour,
        },
      },
    });
  };

  if (loading) return <SkeletonPage />;
  if (fetchError) return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center glass rounded-2xl p-8 max-w-md">
        <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: 'var(--warning-text)' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Failed to Load</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{fetchError}</p>
        <button onClick={() => fetchBike()} className="btn-primary" aria-label="Reload page">Try Again</button>
      </div>
    </div>
  );
  if (!bike) return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center glass rounded-2xl p-8 max-w-md">
        <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: 'var(--warning-text)' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Vehicle Not Found</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>The vehicle you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate(-1)} className="btn-primary" aria-label="Go back">Go Back</button>
      </div>
    </div>
  );

  const images = resolveImages(bike);
  const mainImage = images[0];
  const specs = getBikeSpecs(bike);

  const avgRating = reviewStats?.avgRating ? Number(reviewStats.avgRating) : 0;
  const totalReviews = reviewStats?.total || 0;

  const wishActive = hasWish(bike._id);
  const compareActive = hasCompare(bike._id);

  const headerActions = (
    <>
      <button onClick={() => toggleWishlist(bike._id)}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
        style={{
          border: `1px solid ${wishActive ? '#ef4444' : 'var(--border-base)'}`,
          color: wishActive ? '#ef4444' : 'var(--text-secondary)',
          background: wishActive ? 'rgba(239,68,68,0.1)' : 'var(--card-bg)',
        }}
        aria-label={wishActive ? 'Remove from favorites' : 'Add to favorites'}
        title={wishActive ? 'Saved' : 'Save'}>
        <Heart size={18} fill={wishActive ? '#ef4444' : 'none'} />
      </button>
      <button onClick={() => toggleCompare(bike)}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
        style={{
          border: `1px solid ${compareActive ? 'var(--accent-text)' : 'var(--border-base)'}`,
          color: compareActive ? 'var(--accent-text)' : 'var(--text-secondary)',
          background: compareActive ? 'var(--accent-bg)' : 'var(--card-bg)',
        }}
        aria-label={compareActive ? 'Remove from comparison' : 'Add to comparison'}
        title={compareActive ? 'Comparing' : 'Compare'}>
        <GitCompareArrows size={18} />
      </button>
    </>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center text-sm mb-6 transition-colors min-h-11 px-3 py-2 rounded-lg" style={{ color: 'var(--text-secondary)' }} aria-label="Go back">
        <ArrowLeft size={16} className="mr-1" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-8">
        {/* LEFT COLUMN — Scrollable Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden glass aspect-[4/3] relative group">
              <img src={mainImage} alt={bike.model} className="w-full h-full object-cover transition-transform duration-300" onError={(e) => { e.target.src = 'https://placehold.co/800x600/1a1a2e/666?text=No+Image'; }} />
              <button onClick={() => { setLightboxIndex(selectedImage); setLightboxOpen(true); }}
                className="absolute top-3 right-3 w-10 h-10 glass rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                style={{ color: 'white' }} aria-label="Open fullscreen gallery">
                <Expand size={18} />
              </button>
              {images.length > 1 && (
                <>
                  <button onClick={() => setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 glass rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <ChevronLeft size={20} style={{ color: 'var(--text-primary)' }} />
                  </button>
                  <button onClick={() => setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 glass rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={20} style={{ color: 'var(--text-primary)' }} />
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
                    className={`rounded-xl overflow-hidden aspect-square border-2 transition-all ${selectedImage === i ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'hover:border-amber-500/50'}`}
                    style={selectedImage !== i ? { borderColor: 'var(--border-base)' } : undefined}>
                    <img src={src} alt={`${bike.model} image ${i + 1}`} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/200x200/1a1a2e/666?text=No+Image'; }} />
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
                <div key={i} className="glass rounded-xl p-4 text-center" style={{ border: '1px solid var(--border-base)' }}>
                  <Icon size={20} className="mx-auto mb-1.5" style={{ color: 'var(--accent-text)' }} />
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{spec.label}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{spec.value}</p>
                </div>
              );
            })}
          </div>

          {/* Description */}
          {bike.description && (
            <div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Description</h2>
              <p className="leading-relaxed text-sm" style={{ color: 'var(--text-secondary)' }}>{bike.description}</p>
            </div>
          )}

          {/* Video */}
          {bike.videoUrl && (() => {
            try {
              const url = new URL(bike.videoUrl);
              const allowedHosts = ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'vimeo.com'];
              if (!allowedHosts.includes(url.hostname)) return null;
              return (
                <div className="rounded-2xl overflow-hidden glass">
                  <div className="relative aspect-video flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                    <iframe src={bike.videoUrl} className="w-full h-full" allowFullScreen title="Vehicle video" sandbox="allow-presentation" />
                  </div>
                </div>
              );
            } catch {
              return null;
            }
          })()}

          {/* Requirements & Rules */}
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--warning-border)' }}>
            <h3 className="font-bold flex items-center mb-3 text-sm" style={{ color: 'var(--warning-text)' }}>
              <ShieldCheck size={16} className="mr-2" /> Requirements &amp; Rules
            </h3>
            <ul className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start"><CheckItem /> Original NID and Driving License required</li>
              <li className="flex items-start"><CheckItem /> Minimum advance payment (50% short-term, 30% long-term)</li>
              <li className="flex items-start"><CheckItem /> Petrol cost borne by the customer</li>
              <li className="flex items-start"><CheckItem /> Max 2 persons per bike</li>
            </ul>
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--warning-border)' }}>
              <p className="text-xs font-bold flex items-center gap-1 mb-2" style={{ color: 'var(--warning-text)' }}>
                <AlertCircle size={12} /> Penalty Charges
              </p>
              <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>Beach sand entry: <strong style={{ color: 'var(--danger-text)' }}>1,000 TK fine</strong></li>
                <li>Lost helmet: <strong style={{ color: 'var(--danger-text)' }}>2,000 TK fine</strong></li>
                <li>Beyond Teknaf: <strong style={{ color: 'var(--danger-text)' }}>5,000 TK fine</strong></li>
                <li>Renter liable for all accidents/damage</li>
              </ul>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Sticky Booking Widget */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <BookingWidget bike={bike} token={token} onProceed={handleProceed} headerActions={headerActions} />
          </div>
        </div>
      </div>

      {/* Reviews — full width */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Ratings &amp; Reviews</h2>
            <div className="flex items-center gap-1 text-sm">
              <Star size={14} fill="var(--accent-text)" stroke="var(--accent-text)" />
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{avgRating ? avgRating.toFixed(1) : '0.0'}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({totalReviews} reviews)</span>
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
          <div className="glass rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center border" style={{ borderColor: 'var(--border-base)' }}>
            <Star size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No reviews yet. Be the first to rent and review this vehicle!
            </p>
          </div>
        ) : (
          <ReviewList
            stats={reviewStats}
            reviews={reviews}
            page={reviewPage}
            pages={reviewPages}
            onPageChange={fetchReviews}
            sort={reviewSort}
            onSortChange={setReviewSort}
          />
        )}
      </div>

      {/* You Might Also Like — full width */}
      {recommended.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            You Might Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {recommended.map(rec => (
              <Link key={rec._id} to={`/bike/${rec._id}`}
                className="glass rounded-2xl overflow-hidden card-hover group block" style={{ border: '1px solid var(--border-base)' }}>
                <div className="relative overflow-hidden">
                  <img src={resolveImages(rec)[0]} alt={rec.model}
                    className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy"
                    onError={(e) => { e.target.src = 'https://placehold.co/400x300/1a1a2e/666?text=No+Image'; }} />
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 gradient-primary rounded-lg text-xs font-bold text-white shadow-lg">
                      {rec.pricePerHour} TK/hr
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{rec.model}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rec.brand} &bull; {rec.category?.name || 'Vehicle'}</p>
                  {rec.zone && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {rec.zone.name}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {lightboxOpen && images.length > 0 && (
        <Lightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
};

const CheckItem = () => (
  <span className="mr-2 mt-0.5 flex-shrink-0" style={{ color: 'var(--success-text)' }}>&#10003;</span>
);

export default memo(BikeDetails);
