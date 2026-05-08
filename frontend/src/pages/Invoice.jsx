import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { Bike, Printer } from 'lucide-react';

const Invoice = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await api.get(`/booking/${bookingId}`);
        setBooking(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBooking();
  }, [bookingId]);

  if (!booking) return <div className="p-8 text-center">Loading Invoice...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg my-8 border border-gray-200" id="printable-invoice">
      <div className="flex justify-between items-center border-b-2 border-blue-600 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-blue-600 flex items-center">
            <Bike className="mr-2" /> Rent Bike Cox's Bazar
          </h1>
          <p className="text-gray-500">Official Rental Invoice</p>
        </div>
        <div className="text-right">
          <p className="font-bold">Invoice #: {booking._id.slice(-6).toUpperCase()}</p>
          <p>Date: {new Date(booking.createdAt).toLocaleDateString()}</p>
          <p>Contacts: 01891154443, 01764466757</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-8">
        <div>
          <h3 className="font-bold text-gray-700 uppercase mb-2">Customer Details</h3>
          <p><span className="font-semibold">Name:</span> {booking.user.name}</p>
          <p><span className="font-semibold">NID:</span> {booking.user.nid}</p>
          <p><span className="font-semibold">License:</span> {booking.user.license}</p>
          <p><span className="font-semibold">Phone:</span> {booking.user.phoneNumber}</p>
          <p><span className="font-semibold">Address:</span> {booking.user.address}</p>
        </div>
        <div>
          <h3 className="font-bold text-gray-700 uppercase mb-2">Rental Details</h3>
          <p><span className="font-semibold">Bike:</span> {booking.bike.model} ({booking.bike.brand})</p>
          <p><span className="font-semibold">Start:</span> {new Date(booking.startTime).toLocaleString()}</p>
          <p><span className="font-semibold">End:</span> {new Date(booking.endTime).toLocaleString()}</p>
        </div>
      </div>

      <table className="w-full mb-8">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-2">Bike Rental Fee</td>
            <td className="p-2 text-right">{booking.totalPrice} TK</td>
          </tr>
          <tr className="font-bold text-blue-600">
            <td className="p-2">Advance Paid</td>
            <td className="p-2 text-right">-{booking.advancePaid} TK</td>
          </tr>
          <tr className="font-bold text-xl bg-gray-50">
            <td className="p-2">Due Amount</td>
            <td className="p-2 text-right">{booking.totalPrice - booking.advancePaid} TK</td>
          </tr>
        </tbody>
      </table>

      <div className="bg-gray-50 p-6 rounded-lg mb-8 text-sm">
        <h3 className="font-bold mb-4 uppercase text-center border-b pb-2">Terms & Fine Policies (Mandatory)</h3>
        <ul className="space-y-2 list-decimal ml-4">
          <li><strong>Prohibited:</strong> Taking the bike onto beach sand. Fine: 1,000/- TK.</li>
          <li><strong>Safety:</strong> Driving without a helmet is a legal offense. Max 2 persons per bike. Owner provides the helmet. Lost helmet fine: 2,000/- TK.</li>
          <li><strong>Speed:</strong> Speed must not exceed 50 km/h.</li>
          <li><strong>Boundaries:</strong> Travel beyond Teknaf Marine Drive Zero Point is unauthorized. Fine: 5,000/- TK.</li>
          <li><strong>Liability:</strong> Renter is responsible for all accidents, theft, or damage. Petrol cost must be borne by the customer.</li>
        </ul>
      </div>

      <div className="mt-16 flex justify-between px-8">
        <div className="text-center">
          <div className="w-48 border-t border-black mb-1"></div>
          <p className="font-bold">Owner's Signature</p>
        </div>
        <div className="text-center">
          <div className="w-48 border-t border-black mb-1"></div>
          <p className="font-bold">Renter's (User) Signature</p>
        </div>
      </div>

      <button 
        onClick={() => window.print()}
        className="mt-8 flex items-center bg-gray-800 text-white px-4 py-2 rounded no-print"
      >
        <Printer className="mr-2" size={18} /> Print Invoice
      </button>

      <style>{`
        @media print {
          .no-print { display: none; }
          body { background: white; }
          #printable-invoice { border: none; box-shadow: none; margin: 0; padding: 0; }
        }
      `}</style>
    </div>
  );
};

export default Invoice;
