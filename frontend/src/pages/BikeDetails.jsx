import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Fuel, Users, Zap, ChevronLeft, ChevronRight, AlertTriangle, Timer, CheckCircle, Heart, GitCompareArrows, Expand } from 'lucide-react';
import Lightbox from '../components/Lightbox';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import { useCompare } from '../context/useCompare';
import { useWishlist } from '../context/useWishlist';
import { SkeletonPage } from '../components/ui/Skeleton';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import SeasonalBadge from '../components/SeasonalBadge';

const BikeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [bike, setBike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedTierHours, setSelectedTierHours] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState(null);
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

    api.get(`/availability/bike/${id}`).then(res => {
      setAvailabilityStatus(res.data);
    }).catch(() => {});
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

  const handleBooking = (hoursOverride) => {
    if (!token) { navigate('/login'); return; }
    const h = hoursOverride || selectedTierHours || 4;
    const selectedTier = selectedTierHours
      ? bike.packages?.find(t => t.minHours === selectedTierHours)
      : null;
    navigate(`/checkout/${id}?hours=${h}`, {
      state: selectedTier ? {
        packageName: selectedTier.label,
        packageHourlyRate: selectedTier.hourlyRate,
        durationHours: selectedTier.minHours,
      } : null,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center text-sm mb-6 transition-colors min-h-11 px-3 py-2 rounded-lg" style={{ color: 'var(--text-secondary)' }} aria-label="Go back">
        <ArrowLeft size={16} className="mr-1" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
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

        {/* Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 glass rounded-lg text-xs font-medium" style={{ color: 'var(--pill-text)' }}>{bike.category?.name || 'Vehicle'}</span>
              {bike.isUnderMaintenance ? (
                <span className="px-3 py-1 border rounded-lg text-xs font-medium" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
                  Under Maintenance
                </span>
              ) : availabilityStatus?.availabilityStatus === 'booked_today' ? (
                <span className="px-3 py-1 border rounded-lg text-xs font-medium" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning-text)' }}>
                  Booked Today
                </span>
              ) : bike.availability !== false ? (
                <span className="px-3 py-1 border rounded-lg text-xs font-medium" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success-text)' }}>Available</span>
              ) : (
                <span className="px-3 py-1 border rounded-lg text-xs font-medium" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>Unavailable</span>
              )}
            </div>
            <SeasonalBadge startTime={selectedDateRange?.start || null} />
            <h1 className="text-3xl sm:text-4xl font-bold break-words" style={{ color: 'var(--text-primary)' }}>{bike.model}</h1>
            <p className="mt-1 break-words" style={{ color: 'var(--text-secondary)' }}>{bike.brand}</p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex gap-2">
            <button
              onClick={() => toggleWishlist(bike._id)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                border: `1px solid ${hasWish(bike._id) ? '#ef4444' : 'var(--border-base)'}`,
                color: hasWish(bike._id) ? '#ef4444' : 'var(--text-secondary)',
                background: hasWish(bike._id) ? 'rgba(239,68,68,0.1)' : undefined,
              }}
              aria-label={hasWish(bike._id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={16} fill={hasWish(bike._id) ? '#ef4444' : 'none'} />
              {hasWish(bike._id) ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={() => toggleCompare(bike)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                border: `1px solid ${hasCompare(bike._id) ? 'var(--accent-text)' : 'var(--border-base)'}`,
                color: hasCompare(bike._id) ? 'var(--accent-text)' : 'var(--text-secondary)',
                background: hasCompare(bike._id) ? 'var(--accent-bg)' : undefined,
              }}
              aria-label={hasCompare(bike._id) ? 'Remove from comparison' : 'Add to comparison'}
            >
              <GitCompareArrows size={16} />
              {hasCompare(bike._id) ? 'Comparing' : 'Compare'}
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{bike.pricePerHour || 0}</span>
            <span className="text-lg" style={{ color: 'var(--text-secondary)' }}>TK / hour</span>
          </div>

          {bike.description && <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{bike.description}</p>}

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

          {/* Pricing Tiers */}
          {bike.packages?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bold mb-3 flex items-center text-sm" style={{ color: 'var(--text-primary)' }}>
                <Timer size={16} className="mr-2" style={{ color: 'var(--accent-text)' }} /> Pricing Tiers
              </h3>
              <div className="space-y-2">
                {bike.packages.map((tier, i) => {
                  const tierHours = tier.minHours;
                  const isSelected = selectedTierHours === tierHours;
                  return (
                    <button key={i} type="button" onClick={() => setSelectedTierHours(isSelected ? null : tierHours)}
                      className="w-full flex items-center justify-between glass rounded-xl px-4 py-3 min-h-11 transition-all duration-200 text-left"
                      style={{
                        border: isSelected ? '1.5px solid var(--accent-text)' : '1px solid var(--border-base)',
                        background: isSelected ? 'var(--accent-bg)' : undefined,
                      }} aria-label="Select pricing tier">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tier.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {tier.minHours}h{tier.maxHours ? ` – ${tier.maxHours}h` : '+'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm" style={{ color: 'var(--accent-text)' }}>{tier.hourlyRate} TK/hr</p>
                        {isSelected && <CheckCircle size={14} style={{ color: 'var(--accent-text)' }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Click a tier to pre-fill checkout, or pick any duration on the next page
              </p>
            </div>
          )}

          {/* Requirements */}
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'var(--warning-border)' }}>
            <h3 className="font-bold flex items-center mb-3 text-sm" style={{ color: 'var(--warning-text)' }}>
              <ShieldCheck size={16} className="mr-2" /> Requirements
            </h3>
            <ul className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start"><span className="mr-2" style={{ color: 'var(--warning-text)' }}>•</span> Original NID and Driving License required</li>
              <li className="flex items-start"><span className="mr-2" style={{ color: 'var(--warning-text)' }}>•</span> Minimum advance payment (50% short-term, 30% long-term)</li>
              <li className="flex items-start"><span className="mr-2" style={{ color: 'var(--warning-text)' }}>•</span> Petrol cost borne by the customer</li>
              <li className="flex items-start"><span className="mr-2" style={{ color: 'var(--warning-text)' }}>•</span> Max 2 persons per bike</li>
            </ul>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Zap, label: 'Instant', value: 'Booking', iconStyle: { color: 'var(--info-text)' } },
              { icon: Fuel, label: 'Customer', value: 'Fuel', iconStyle: { color: 'var(--success-text)' } },
              { icon: Users, label: 'Max', value: '2 Persons', iconStyle: { color: 'var(--warning-text)' } },
            ].map((item, i) => (
              <div key={i} className="glass rounded-xl p-3 text-center" style={{ border: '1px solid var(--border-base)' }}>
                <item.icon size={20} className="mx-auto mb-1" style={item.iconStyle} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Availability Calendar */}
          <AvailabilityCalendar
            bikeId={id}
            selectedRange={selectedDateRange}
            onDateSelect={(date) => {
              if (!selectedDateRange?.start || (selectedDateRange.start && selectedDateRange.end)) {
                setSelectedDateRange({ start: date, end: null });
              } else {
                const start = new Date(selectedDateRange.start);
                if (date > start) {
                  setSelectedDateRange({ start: selectedDateRange.start, end: date });
                } else {
                  setSelectedDateRange({ start: date, end: null });
                }
              }
            }}
          />

          {/* Book Button */}
          <button onClick={() => handleBooking()} className="btn-primary w-full text-lg !py-4 flex items-center justify-center" aria-label="Book this vehicle">
            {token ? (selectedTierHours ? `Book Now (${selectedTierHours}h)` : 'Book Now') : 'Login to Book'}
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-12">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
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
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rec.brand} • {rec.category?.name || 'Vehicle'}</p>
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

      {lightboxOpen && bike.images?.length > 0 && (
        <Lightbox images={bike.images} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
};

export default memo(BikeDetails);
