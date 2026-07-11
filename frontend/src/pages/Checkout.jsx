import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { CreditCard } from 'lucide-react';

const formatDateTime = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const Checkout = () => {
  const { bikeId } = useParams();
  const [bike, setBike] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBike = async () => {
      try {
        const res = await api.get(`/dashboard/bikes/${bikeId}`);
        setBike(res.data);
        const now = new Date();
        const later = new Date(now.getTime() + 5 * 60 * 60 * 1000);
        setStartTime(formatDateTime(now));
        setEndTime(formatDateTime(later));
      } catch (err) {
        console.error(err);
      }
    };
    fetchBike();
  }, [bikeId]);

  useEffect(() => {
    if (!startTime || !endTime) return;
    const createBooking = async () => {
      try {
        setError('');
        const res = await api.post('/booking', {
          bikeId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          couponCode
        });
        setBookingData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to create booking');
        setBookingData(null);
      }
    };
    createBooking();
  }, [startTime, endTime, couponCode, bikeId]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      const response = await api.post('/payment/init', {
        bookingId: bookingData.booking._id
      });
      if (response.data.url) {
        window.location.replace(response.data.url);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment initialization failed');
      setLoading(false);
    }
  };

  const formatDisplayDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-BD', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (!bike) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
        {/* Bike Info */}
        <div className="border-b pb-4">
          <h2 className="text-xl font-bold">{bike.model}</h2>
          <p className="text-gray-600">{bike.brand} - {bike.category}</p>
          <p className="text-blue-600 font-semibold mt-1">{bike.pricePerHour} TK / Hour</p>
        </div>

        {/* Duration Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        {/* Coupon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code (optional)</label>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="e.g. WELCOME10"
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Price Breakdown */}
        {bookingData && (
          <>
            <div className="flex justify-between border-b pb-4">
              <span className="text-gray-600">Total Price:</span>
              <span className="font-bold text-xl">{bookingData.booking.totalPrice} TK</span>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center text-blue-800">
              <span className="font-medium">Advance Required:</span>
              <span className="font-bold text-2xl">{bookingData.minAdvance} TK</span>
            </div>

            <div className="text-sm text-gray-500 space-y-1">
              <p>Duration: {formatDisplayDate(startTime)} to {formatDisplayDate(endTime)}</p>
              {bookingData.booking.totalPrice !== bike.pricePerHour * Math.ceil((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)) && (
                <p className="text-green-600">Coupon applied: {couponCode}</p>
              )}
            </div>

            {/* Payment */}
            <div className="space-y-4 pt-4">
              <h3 className="font-bold flex items-center">
                <CreditCard className="mr-2" /> Pay with SSLCommerz (bKash/Nagad/Bank)
              </h3>
              <p className="text-sm text-gray-500">You will be redirected to the secure payment gateway.</p>

              <button
                onClick={handlePayment}
                disabled={loading}
                className={`w-full p-4 rounded font-bold text-white transition bg-blue-600 hover:bg-blue-700 ${loading && 'opacity-50 cursor-not-allowed'}`}
              >
                {loading ? 'Initializing Payment...' : 'Proceed to Payment'}
              </button>
            </div>
          </>
        )}

        <p className="text-center text-amber-600 text-sm mt-4 italic">
          Note: Your booking will only be confirmed after a successful advance payment.
        </p>
      </div>
    </div>
  );
};

export default Checkout;
