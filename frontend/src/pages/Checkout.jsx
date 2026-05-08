import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CreditCard, CheckCircle } from 'lucide-react';

const Checkout = () => {
  const { bikeId } = useParams();
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initializing a mock booking intent
    const initBooking = async () => {
      try {
        const res = await api.post('/booking', {
          bikeId,
          startTime: new Date(),
          endTime: new Date(new Date().getTime() + 5 * 60 * 60 * 1000), // 5 hours later
          couponCode: ''
        });
        setBookingData(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    initBooking();
  }, [bikeId]);

  const handleRealPayment = async () => {
    try {
      setLoading(true);
      const response = await api.post('/payment/init', {
        bookingId: bookingData.booking._id
      });
      
      if (response.data.url) {
        window.location.replace(response.data.url); // Redirect to SSLCommerz
      }
    } catch (err) {
      alert('Payment initialization failed');
      setLoading(false);
    }
  };

  if (!bookingData) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
        <div className="flex justify-between border-b pb-4">
          <span className="text-gray-600">Total Price:</span>
          <span className="font-bold text-xl">{bookingData.booking.totalPrice} TK</span>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center text-blue-800">
          <span className="font-medium">Mandatory 50% Advance:</span>
          <span className="font-bold text-2xl">{bookingData.minAdvance} TK</span>
        </div>

        <div className="space-y-4 pt-4">
          <h3 className="font-bold flex items-center">
            <CreditCard className="mr-2" /> Pay with SSLCommerz (bKash/Nagad/Bank)
          </h3>
          <p className="text-sm text-gray-500">You will be redirected to the secure payment gateway.</p>

          <button 
            onClick={handleRealPayment}
            disabled={loading}
            className={`w-full p-4 rounded font-bold text-white transition bg-blue-600 hover:bg-blue-700 ${loading && 'opacity-50'}`}
          >
            {loading ? 'Initializing Payment...' : 'Proceed to Payment'}
          </button>
        </div>

        <p className="text-center text-amber-600 text-sm mt-4 italic">
          Note: Your booking will only be confirmed after a successful advance payment.
        </p>
      </div>
    </div>
  );
};

export default Checkout;
