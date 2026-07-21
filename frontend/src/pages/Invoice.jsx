import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { Bike, Printer, XCircle } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../components/useToast';
import { SkeletonPage } from '../components/ui/Skeleton';

const Invoice = () => {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api.get(`/booking/${bookingId}`)
      .then(res => setBooking(res.data))
      .catch(() => addToast('Failed to load invoice', 'error'))
      .finally(() => setLoading(false));
  }, [bookingId, addToast]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      const res = await api.put(`/booking/${bookingId}/cancel`);
      setBooking(res.data.booking);
      addToast('Booking cancelled successfully', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel booking', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <SkeletonPage />;
  if (!booking) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-gray-400 text-lg">Invoice not found.</p>
    </div>
  );

  const canCancel = (booking.status === 'Pending' || booking.status === 'Confirmed') && user;
  const serialNo = `RBC-${new Date(booking.createdAt).getFullYear()}-${booking._id.slice(-4).toUpperCase()}`;
  const securityDeposit = booking.securityDeposit || 2000;

  const statusColors = {
    Confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    Completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-fade-in">
      {/* Screen view: dark invoice */}
      <div className="glass rounded-3xl overflow-hidden" id="printable-invoice">
        {/* Header */}
        <div className="text-center p-6 sm:p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center">
            <Bike className="mr-2 text-cyan-400" />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Rent Bike Cox's Bazar</span>
          </h1>
          <p className="text-gray-400 mt-1">Official Rental Invoice</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-400">
            <div><span className="font-semibold text-white">Mobile:</span> 01891-154443, 01764-466757</div>
            <div><span className="font-semibold text-white">Date:</span> {new Date(booking.createdAt).toLocaleDateString('en-BD')}</div>
            <div><span className="font-semibold text-white">Serial No:</span> {serialNo}</div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Renter & Trip Details */}
          <div>
            <h3 className="font-bold text-cyan-400 uppercase mb-3 text-sm tracking-wide">Renter & Trip Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <p><span className="font-semibold text-gray-400">Rider Name:</span> <span className="text-white">{booking.user.name}</span></p>
                <p><span className="font-semibold text-gray-400">Mobile No:</span> <span className="text-white">{booking.user.phoneNumber}</span></p>
              </div>
              <div className="space-y-1.5">
                <p><span className="font-semibold text-gray-400">Destination:</span> <span className="text-white">{booking.destination || 'Not specified'}</span></p>
                <p><span className="font-semibold text-gray-400">Rental Date:</span> <span className="text-white">{new Date(booking.startTime).toLocaleDateString('en-BD', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></p>
                <p><span className="font-semibold text-gray-400">Hourly Rate:</span> <span className="text-white">{booking.bike.pricePerHour} TK</span></p>
              </div>
            </div>
          </div>

          {/* Payment & Vehicle Details */}
          <div>
            <h3 className="font-bold text-cyan-400 uppercase mb-3 text-sm tracking-wide">Payment & Vehicle Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <p><span className="font-semibold text-gray-400">Vehicle:</span> <span className="text-white">{booking.bike.model} ({booking.bike.brand})</span></p>
                <p><span className="font-semibold text-gray-400">NID No:</span> <span className="text-white">{booking.user.nid}</span></p>
                <p><span className="font-semibold text-gray-400">License No:</span> <span className="text-white">{booking.user.license}</span></p>
              </div>
              <div className="space-y-1.5">
                <p><span className="font-semibold text-gray-400">Total Amount:</span> <span className="text-white font-bold">{booking.totalPrice} TK/-</span></p>
                <p><span className="font-semibold text-gray-400">Advance Paid:</span> <span className="text-green-400">{booking.advancePaid} TK</span></p>
                <p><span className="font-semibold text-gray-400">Due Amount:</span> <span className="text-amber-400">{booking.totalPrice - booking.advancePaid} TK</span></p>
                <p><span className="font-semibold text-gray-400">Security Deposit:</span> <span className="text-white">{securityDeposit} TK (Cash/Document)</span></p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="text-sm">
            <span className="font-semibold text-gray-400">Booking Status: </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[booking.status] || 'bg-white/5 text-gray-400 border-white/10'}`}>
              {booking.status}
            </span>
          </div>

          {/* Terms */}
          <div className="glass rounded-2xl p-6 text-sm border border-white/5">
            <h3 className="font-bold mb-4 uppercase text-center border-b border-white/10 pb-3 text-white">Terms & Fine Policies (Mandatory)</h3>
            <ol className="space-y-2 list-decimal ml-4 text-gray-400">
              <li><strong className="text-white">Strictly Prohibited:</strong> Taking the bike onto the beach sand. Fine: <strong className="text-amber-400">1,000/- TK</strong>.</li>
              <li>Bikes will not be rented without a valid <strong className="text-white">Driving License</strong>.</li>
              <li>Helmet provided. Maximum <strong className="text-white">two persons</strong> per bike.</li>
              <li>Speed must not exceed <strong className="text-white">50 km/h</strong>.</li>
              <li>The renter is responsible for all accidents, theft, or damage.</li>
              <li>Beyond <strong className="text-white">Teknaf Marine Drive Zero Point</strong>: <strong className="text-amber-400">5,000/- TK</strong> fine.</li>
              <li>All traffic laws must be followed.</li>
              <li>Lost helmet: <strong className="text-amber-400">2,000/- TK</strong>. Damaged helmet: fines apply.</li>
            </ol>
            <p className="mt-4 text-gray-400 text-center">
              <strong className="text-white">Petrol Cost:</strong> Borne by the customer. Owner does not provide fuel.
            </p>
            <p className="mt-2 text-gray-400 text-center">
              <strong className="text-white">Liability:</strong> Most bikes are uninsured. Renter is fully liable for all damages.
            </p>
          </div>

          {/* Signatures */}
          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row justify-between px-4 sm:px-8 gap-8">
            <div className="text-center">
              <div className="w-48 border-t border-white/20 mb-2"></div>
              <p className="font-bold text-sm text-gray-400">Owner's Signature</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-t border-white/20 mb-2"></div>
              <p className="font-bold text-sm text-gray-400">Renter's (User) Signature</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-6 no-print">
        <button onClick={() => window.print()} className="btn-primary flex items-center">
          <Printer className="mr-2" size={18} /> Print Invoice
        </button>
        {canCancel && (
          <button onClick={handleCancel} disabled={cancelling} className="btn-danger flex items-center">
            <XCircle className="mr-2" size={18} /> {cancelling ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          #printable-invoice { background: white !important; border: 1px solid #ddd !important; box-shadow: none !important; margin: 0 !important; padding: 20px !important; border-radius: 0 !important; }
          #printable-invoice * { color: #111 !important; border-color: #ddd !important; background: transparent !important; }
        }
      `}</style>
    </div>
  );
};

export default Invoice;
