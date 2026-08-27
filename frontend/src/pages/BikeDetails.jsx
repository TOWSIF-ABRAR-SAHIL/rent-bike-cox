import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, AlertTriangle, Heart, GitCompareArrows, Expand, Gauge, Fuel, Users, Zap, ShieldCheck, AlertCircle } from 'lucide-react';
import Lightbox from '../components/Lightbox';
import BookingWidget from '../components/BookingWidget';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import { useCompare } from '../context/useCompare';
import { useWishlist } from '../context/useWishlist';
import { SkeletonPage } from '../components/ui/Skeleton';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';

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

  const specs = [
    bike.engine && { icon: Gauge, label: 'Engine', value: bike.engine },
    bike.mileage && { icon: Fuel, label: 'Mileage', value: `${bike.mileage} km/L` },
    { icon: Users, label: 'Capacity', value: `${bike.capacity || 2} Persons` },
    { icon: Zap, label: 'Type', value: bike.category?.name || 'Vehicle' },
  ].filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center text-sm mb-6 transition-colors min-h-11 px-3 py-2 rounded-lg" style={{ color: 'var(--text-secondary)' }} aria-label="Go back">
        <ArrowLeft size={16} className="mr-1" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
        {/* LEFT COLUMN — Scrollable Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden glass aspect-[4/3] relative group">
              <img src={bike.images?.[selectedImage] || 'https://placehold.co/800x600/1a1a2e/666?text=No+Image'} alt={bike.model} className="w-full h-full object-cover transition-transform duration-300" onError={(e) => { e.target.src = 'https://placehold.co/800x600/1a1a2e/666?text=No+Image'; }} />
              <button onClick={() => { setLightboxIndex(selectedImage); setLightboxOpen(true); }}
                className="absolute top-3 right-3 w-10 h-10 glass rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                style={{ color: 'white' }} aria-label="Open fullscreen gallery">
                <Expand size={18} />
              </button>
              {bike.images?.length > 1 && (
                <>
                  <button onClick={() => setSelectedImage(prev => prev === 0 ? bike.images.length - 1 : prev - 1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 glass rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <ChevronLeft size={20} style={{ color: 'var(--text-primary)' }} />
                  </button>
                  <button onClick={() => setSelectedImage(prev => prev === bike.images.length - 1 ? 0 : prev + 1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 glass rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={20} style={{ color: 'var(--text-primary)' }} />
                  </button>
                </>
              )}
            </div>
            {bike.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {bike.images.map((img, index) => (
                  <button key={index} onClick={() => setSelectedImage(index)}
                    aria-label={`View image ${index + 1}`}
                    className={`rounded-xl overflow-hidden aspect-square border-2 transition-all ${selectedImage === index ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'hover:border-amber-500/50'}`}
                    style={selectedImage !== index ? { borderColor: 'var(--border-base)' } : undefined}>
                    <img src={img || 'https://placehold.co/200x200/1a1a2e/666?text=No+Image'} alt={`Angle ${index + 1}`} width="80" height="60" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/200x200/1a1a2e/666?text=No+Image'; }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Overview — Icon Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {specs.map((spec, i) => (
              <div key={i} className="glass rounded-xl p-4 text-center" style={{ border: '1px solid var(--border-base)' }}>
                <spec.icon size={20} className="mx-auto mb-1.5" style={{ color: 'var(--accent-text)' }} />
                <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{spec.label}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{spec.value}</p>
              </div>
            ))}
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

          {/* Reviews */}
          <div>
            {token && (
              <div className="mb-6">
                <ReviewForm onSubmit={handleReviewSubmit} loading={reviewLoading} />
              </div>
            )}
            {reviewStats && (
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

          {/* You Might Also Like */}
          {recommended.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                You Might Also Like
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {recommended.map(rec => (
                  <Link key={rec._id} to={`/bike/${rec._id}`}
                    className="glass rounded-2xl overflow-hidden card-hover group block" style={{ border: '1px solid var(--border-base)' }}>
                    <div className="relative overflow-hidden">
                      <img src={rec.images?.[0] || 'https://placehold.co/400x300/1a1a2e/666?text=No+Image'} alt={rec.model}
                        className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
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

          {/* Action Buttons (mobile-only, below content) */}
          <div className="flex gap-2 lg:hidden">
            <button onClick={() => toggleWishlist(bike._id)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
              style={{
                border: `1px solid ${hasWish(bike._id) ? '#ef4444' : 'var(--border-base)'}`,
                color: hasWish(bike._id) ? '#ef4444' : 'var(--text-secondary)',
                background: hasWish(bike._id) ? 'rgba(239,68,68,0.1)' : undefined,
              }}
              aria-label={hasWish(bike._id) ? 'Remove from favorites' : 'Add to favorites'}>
              <Heart size={16} fill={hasWish(bike._id) ? '#ef4444' : 'none'} />
              {hasWish(bike._id) ? 'Saved' : 'Save'}
            </button>
            <button onClick={() => toggleCompare(bike)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
              style={{
                border: `1px solid ${hasCompare(bike._id) ? 'var(--accent-text)' : 'var(--border-base)'}`,
                color: hasCompare(bike._id) ? 'var(--accent-text)' : 'var(--text-secondary)',
                background: hasCompare(bike._id) ? 'var(--accent-bg)' : undefined,
              }}
              aria-label={hasCompare(bike._id) ? 'Remove from comparison' : 'Add to comparison'}>
              <GitCompareArrows size={16} />
              {hasCompare(bike._id) ? 'Comparing' : 'Compare'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN — Sticky Booking Widget */}
        <div className="lg:col-span-2">
          {/* Desktop: sticky widget */}
          <div className="hidden lg:block">
            <BookingWidget bike={bike} token={token} onProceed={handleProceed} />
            {/* Action Buttons under widget on desktop */}
            <div className="flex gap-2 mt-4">
              <button onClick={() => toggleWishlist(bike._id)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
                style={{
                  border: `1px solid ${hasWish(bike._id) ? '#ef4444' : 'var(--border-base)'}`,
                  color: hasWish(bike._id) ? '#ef4444' : 'var(--text-secondary)',
                  background: hasWish(bike._id) ? 'rgba(239,68,68,0.1)' : undefined,
                }}
                aria-label={hasWish(bike._id) ? 'Remove from favorites' : 'Add to favorites'}>
                <Heart size={16} fill={hasWish(bike._id) ? '#ef4444' : 'none'} />
                {hasWish(bike._id) ? 'Saved' : 'Save'}
              </button>
              <button onClick={() => toggleCompare(bike)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
                style={{
                  border: `1px solid ${hasCompare(bike._id) ? 'var(--accent-text)' : 'var(--border-base)'}`,
                  color: hasCompare(bike._id) ? 'var(--accent-text)' : 'var(--text-secondary)',
                  background: hasCompare(bike._id) ? 'var(--accent-bg)' : undefined,
                }}
                aria-label={hasCompare(bike._id) ? 'Remove from comparison' : 'Add to comparison'}>
                <GitCompareArrows size={16} />
                {hasCompare(bike._id) ? 'Comparing' : 'Compare'}
              </button>
            </div>
          </div>
          {/* Mobile: normal flow widget (not sticky) */}
          <div className="lg:hidden">
            <BookingWidget bike={bike} token={token} onProceed={handleProceed} />
          </div>
        </div>
      </div>

      {lightboxOpen && bike.images?.length > 0 && (
        <Lightbox images={bike.images} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
};

const CheckItem = () => (
  <span className="mr-2 mt-0.5 flex-shrink-0" style={{ color: 'var(--success-text)' }}>&#10003;</span>
);

export default memo(BikeDetails);
