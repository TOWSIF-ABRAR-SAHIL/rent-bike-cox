import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import api from '../api/axios';

const BikeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bike, setBike] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchBike = async () => {
      try {
        const [bikeRes, settingsRes] = await Promise.all([
          api.get(`/dashboard/bikes/${id}`),
          api.get('/dashboard/settings')
        ]);
        setBike(bikeRes.data);
        setSettings(settingsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBike();
  }, [id]);

  const handleBooking = () => {
    if (!token) {
      navigate('/login');
    } else {
      navigate(`/checkout/${id}`);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!bike) return <div className="p-8 text-center">Bike not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <img src={bike.images[0]} alt={bike.model} className="w-full rounded-lg shadow-lg" />
          <div className="grid grid-cols-3 gap-4">
            {bike.images.map((img, index) => (
              <img key={index} src={img} alt={`Angle ${index + 1}`} className="w-full h-24 object-cover rounded cursor-pointer border hover:border-blue-600" />
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold">{bike.model}</h1>
          <p className="text-2xl text-blue-600 font-bold">{bike.pricePerHour} TK / Hour</p>
          <p className="text-gray-700">{bike.description}</p>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold mb-2">Available Packages:</h3>
            <ul className="space-y-2">
              {settings?.packages?.map((pkg, i) => (
                <li key={i} className="flex justify-between border-b pb-1">
                  <span>{pkg.name}</span>
                  <span className="font-bold">{pkg.price} TK</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-800 space-y-2">
            <p className="flex items-center font-bold">
              <ShieldCheck className="mr-2" size={18} /> Mandatory Requirements:
            </p>
            <ul className="list-disc ml-6">
              <li>Original NID and Driving License copy required.</li>
              <li>Minimum 50% advance payment for booking.</li>
              <li>Petrol cost must be borne by the customer.</li>
            </ul>
          </div>

          <button 
            onClick={handleBooking}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-xl hover:bg-blue-700 shadow-lg"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default BikeDetails;
