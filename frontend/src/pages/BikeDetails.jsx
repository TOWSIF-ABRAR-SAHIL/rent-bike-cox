import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Clock, Fuel, Users, Zap, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import { SkeletonPage } from '../components/ui/Skeleton';

const BikeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [bike, setBike] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/dashboard/bikes/${id}`),
      api.get('/dashboard/settings')
    ]).then(([bikeRes, settingsRes]) => {
      setBike(bikeRes.data);
      setSettings(settingsRes.data);
    }).catch(() => setFetchError('Failed to load vehicle details. Please try again.')).finally(() => setLoading(false));
  }, [id]);

  const handleBooking = () => {
    navigate(token ? `/checkout/${id}` : '/login');
  };

  if (loading) return <SkeletonPage />;
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
  if (!bike) return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center glass rounded-2xl p-8 max-w-md">
        <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: 'var(--warning-text)' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Vehicle Not Found</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>The vehicle you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center text-sm mb-6 transition-colors min-h-11 px-3 py-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={16} className="mr-1" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden glass aspect-[4/3] relative group">
            <img src={bike.images?.[selectedImage] || 'https://placehold.co/800x600/1a1a2e/666?text=No+Image'} alt={bike.model} className="w-full h-full object-cover transition-transform duration-300" onError={(e) => { e.target.src = 'https://placehold.co/800x600/1a1a2e/666?text=No+Image'; }} />
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
                  className={`rounded-xl overflow-hidden aspect-square border-2 transition-all ${selectedImage === index ? 'border-primary-500 shadow-lg shadow-primary-500/20' : 'hover:border-primary-500/50'}`}
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
              {bike.availability !== false && <span className="px-3 py-1 border rounded-lg text-xs font-medium" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success-text)' }}>Available</span>}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold break-words" style={{ color: 'var(--text-primary)' }}>{bike.model}</h1>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{bike.brand}</p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{bike.pricePerHour}</span>
            <span className="text-lg" style={{ color: 'var(--text-secondary)' }}>TK / hour</span>
          </div>

          {bike.description && <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{bike.description}</p>}

          {bike.videoUrl && (
            <div className="rounded-2xl overflow-hidden glass">
              <div className="relative aspect-video flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                <iframe src={bike.videoUrl} className="w-full h-full" allowFullScreen title="Vehicle video" sandbox="allow-scripts allow-presentation" />
              </div>
            </div>
          )}

          {/* Packages */}
          {settings?.packages?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bold mb-3 flex items-center text-sm" style={{ color: 'var(--text-primary)' }}>
                <Clock size={16} className="mr-2" style={{ color: 'var(--accent-text)' }} /> Available Packages
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {settings.packages.map((pkg, i) => (
                  <div key={i} className="glass rounded-xl p-3" style={{ border: '1px solid var(--border-base)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{pkg.name}</p>
                    <p className="font-bold text-sm" style={{ color: 'var(--accent-text)' }}>{pkg.price} TK</p>
                  </div>
                ))}
              </div>
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

          {/* Book Button */}
          <button onClick={handleBooking} className="btn-primary w-full text-lg !py-4 flex items-center justify-center">
            {token ? 'Book Now' : 'Login to Book'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BikeDetails;
