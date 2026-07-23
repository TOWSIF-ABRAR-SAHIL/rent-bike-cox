import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Clock, Fuel, Users, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    Promise.all([
      api.get(`/dashboard/bikes/${id}`),
      api.get('/dashboard/settings')
    ]).then(([bikeRes, settingsRes]) => {
      setBike(bikeRes.data);
      setSettings(settingsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleBooking = () => {
    navigate(token ? `/checkout/${id}` : '/login');
  };

  if (loading) return <SkeletonPage />;
  if (!bike) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-gray-400 text-lg">Vehicle not found.</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-400 hover:text-white text-sm mb-6 transition-colors">
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 glass rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronLeft size={20} className="text-white" />
                </button>
                <button onClick={() => setSelectedImage(prev => prev === bike.images.length - 1 ? 0 : prev + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 glass rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={20} className="text-white" />
                </button>
              </>
            )}
          </div>
          {bike.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {bike.images.map((img, index) => (
                <button key={index} onClick={() => setSelectedImage(index)}
                  className={`rounded-xl overflow-hidden aspect-square border-2 transition-all ${selectedImage === index ? 'border-primary-500 shadow-lg shadow-primary-500/20' : 'border-white/10 hover:border-white/20'}`}>
                  <img src={img || 'https://placehold.co/200x200/1a1a2e/666?text=No+Image'} alt={`Angle ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://placehold.co/200x200/1a1a2e/666?text=No+Image'; }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 glass rounded-lg text-xs font-medium text-cyan-300">{bike.category?.name || 'Vehicle'}</span>
              {bike.availability !== false && <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-xs font-medium text-green-400">Available</span>}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{bike.model}</h1>
            <p className="text-gray-400 mt-1">{bike.brand}</p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{bike.pricePerHour}</span>
            <span className="text-gray-400 text-lg">TK / hour</span>
          </div>

          {bike.description && <p className="text-gray-400 leading-relaxed">{bike.description}</p>}

          {bike.videoUrl && (
            <div className="rounded-2xl overflow-hidden glass">
              <div className="relative aspect-video bg-black/50 flex items-center justify-center">
                <iframe src={bike.videoUrl} className="w-full h-full" allowFullScreen title="Vehicle video" />
              </div>
            </div>
          )}

          {/* Packages */}
          {settings?.packages?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bold text-white mb-3 flex items-center text-sm">
                <Clock size={16} className="mr-2 text-cyan-400" /> Available Packages
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {settings.packages.map((pkg, i) => (
                  <div key={i} className="glass rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-gray-400">{pkg.name}</p>
                    <p className="font-bold text-cyan-300 text-sm">{pkg.price} TK</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          <div className="glass rounded-2xl p-5 border border-amber-500/10">
            <h3 className="font-bold text-amber-300 flex items-center mb-3 text-sm">
              <ShieldCheck size={16} className="mr-2" /> Requirements
            </h3>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start"><span className="mr-2 text-amber-400">•</span> Original NID and Driving License required</li>
              <li className="flex items-start"><span className="mr-2 text-amber-400">•</span> Minimum advance payment (50% short-term, 30% long-term)</li>
              <li className="flex items-start"><span className="mr-2 text-amber-400">•</span> Petrol cost borne by the customer</li>
              <li className="flex items-start"><span className="mr-2 text-amber-400">•</span> Max 2 persons per bike</li>
            </ul>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Zap, label: 'Instant', value: 'Booking', color: 'text-blue-400' },
              { icon: Fuel, label: 'Customer', value: 'Fuel', color: 'text-green-400' },
              { icon: Users, label: 'Max', value: '2 Persons', color: 'text-amber-400' },
            ].map((item, i) => (
              <div key={i} className="glass rounded-xl p-3 text-center border border-white/5">
                <item.icon size={20} className={`mx-auto mb-1 ${item.color}`} />
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm font-bold text-white">{item.value}</p>
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
