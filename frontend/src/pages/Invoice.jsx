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
      <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Invoice not found.</p>
    </div>
  );

  const canCancel = (booking.status === 'Pending' || booking.status === 'Confirmed') && user;
  const serialNo = `RBC-${new Date(booking.createdAt).getFullYear()}-${booking._id.slice(-4).toUpperCase()}`;
  const securityDeposit = booking.securityDeposit || 2000;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-fade-in">
      {/* Screen view: dark invoice */}
      <div className="glass rounded-3xl overflow-hidden" id="printable-invoice">
        {/* Header */}
        <div className="text-center p-6 sm:p-8 border-b bg-gradient-to-r from-blue-500/10 to-cyan-500/10" style={{ borderColor: 'var(--border-base)' }}>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center">
            <Bike className="mr-2 text-cyan-400" />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Rent Bike Cox's Bazar</span>
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Official Rental Invoice</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Mobile:</span> 01891-154443, 01764-466757</div>
            <div><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Date:</span> {new Date(booking.createdAt).toLocaleDateString('en-BD')}</div>
            <div><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Serial No:</span> {serialNo}</div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Renter & Trip Details */}
          <div>
            <h3 className="font-bold text-cyan-400 uppercase mb-3 text-sm tracking-wide">Renter & Trip Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Rider Name:</span> <span style={{ color: 'var(--text-primary)' }}>{booking.user.name}</span></p>
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Mobile No:</span> <span style={{ color: 'var(--text-primary)' }}>{booking.user.phoneNumber}</span></p>
              </div>
              <div className="space-y-1.5">
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Destination:</span> <span style={{ color: 'var(--text-primary)' }}>{booking.destination || 'Not specified'}</span></p>
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Rental Date:</span> <span style={{ color: 'var(--text-primary)' }}>{new Date(booking.startTime).toLocaleDateString('en-BD', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></p>
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Hourly Rate:</span> <span style={{ color: 'var(--text-primary)' }}>{booking.bike.pricePerHour} TK</span></p>
              </div>
            </div>
          </div>

          {/* Payment & Vehicle Details */}
          <div>
            <h3 className="font-bold text-cyan-400 uppercase mb-3 text-sm tracking-wide">Payment & Vehicle Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Vehicle:</span> <span style={{ color: 'var(--text-primary)' }}>{booking.bike.model} ({booking.bike.brand})</span></p>
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>NID No:</span> <span style={{ color: 'var(--text-primary)' }}>{booking.user.nid}</span></p>
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>License No:</span> <span style={{ color: 'var(--text-primary)' }}>{booking.user.license}</span></p>
              </div>
              <div className="space-y-1.5">
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Total Amount:</span> <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{booking.totalPrice} TK/-</span></p>
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Advance Paid:</span> <span className="text-green-400">{booking.advancePaid} TK</span></p>
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Due Amount:</span> <span className="text-amber-400">{booking.totalPrice - booking.advancePaid} TK</span></p>
                <p><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Security Deposit:</span> <span style={{ color: 'var(--text-primary)' }}>{securityDeposit} TK (Cash/Document)</span></p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="text-sm">
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Booking Status: </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border`} style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border-base)' }}>
              {booking.status}
            </span>
          </div>

          {/* Terms */}
          <div className="glass rounded-2xl p-6 text-sm border" style={{ borderColor: 'var(--border-base)' }}>
            <h3 className="font-bold mb-4 uppercase text-center border-b pb-3" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-base)' }}>Terms & Fine Policies (Mandatory)</h3>
            <ol className="space-y-2 list-decimal ml-4" style={{ color: 'var(--text-secondary)' }}>
              <li><strong style={{ color: 'var(--text-primary)' }}>Strictly Prohibited:</strong> Taking the bike onto the beach sand. Fine: <strong className="text-amber-400">1,000/- TK</strong>.</li>
              <li>Bikes will not be rented without a valid <strong style={{ color: 'var(--text-primary)' }}>Driving License</strong>.</li>
              <li>Helmet provided. Maximum <strong style={{ color: 'var(--text-primary)' }}>two persons</strong> per bike.</li>
              <li>Speed must not exceed <strong style={{ color: 'var(--text-primary)' }}>50 km/h</strong>.</li>
              <li>The renter is responsible for all accidents, theft, or damage.</li>
              <li>Beyond <strong style={{ color: 'var(--text-primary)' }}>Teknaf Marine Drive Zero Point</strong>: <strong className="text-amber-400">5,000/- TK</strong> fine.</li>
              <li>All traffic laws must be followed.</li>
              <li>Lost helmet: <strong className="text-amber-400">2,000/- TK</strong>. Damaged helmet: fines apply.</li>
            </ol>
            <p className="mt-4 text-center" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Petrol Cost:</strong> Borne by the customer. Owner does not provide fuel.
            </p>
            <p className="mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Liability:</strong> Most bikes are uninsured. Renter is fully liable for all damages.
            </p>
          </div>

          {/* Signatures */}
          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row justify-between px-4 sm:px-8 gap-8">
            <div className="text-center">
              <div className="w-48 border-t mb-2" style={{ borderColor: 'var(--border-strong)' }}></div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>Owner's Signature</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-t mb-2" style={{ borderColor: 'var(--border-strong)' }}></div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>Renter's (User) Signature</p>
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
