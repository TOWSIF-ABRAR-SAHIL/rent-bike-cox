import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Settings, Tag, Users, Bike } from 'lucide-react';

const AdminDashboard = () => {
  const [settings, setSettings] = useState({ basePricePerHour: 200, packages: [] });
  const [bikes, setBikes] = useState([]);
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, bikesRes] = await Promise.all([
        api.get('/dashboard/settings'),
        api.get('/dashboard/admin/bikes')
      ]);
      setSettings(settingsRes.data);
      setBikes(bikesRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/dashboard/admin/settings', settings);
      alert('Settings updated successfully!');
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="flex space-x-4 mb-8">
        <button onClick={() => setActiveTab('settings')} className={`flex items-center px-4 py-2 rounded ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
          <Settings className="mr-2" size={18} /> Settings
        </button>
        <button onClick={() => setActiveTab('bikes')} className={`flex items-center px-4 py-2 rounded ${activeTab === 'bikes' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
          <Bike className="mr-2" size={18} /> Manage Bikes
        </button>
        <button onClick={() => setActiveTab('coupons')} className={`flex items-center px-4 py-2 rounded ${activeTab === 'coupons' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
          <Tag className="mr-2" size={18} /> Coupons
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded shadow-md max-w-2xl">
          <h2 className="text-xl font-bold mb-4">Global Fees & Pricing</h2>
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Base Price Per Hour (TK)</label>
              <input 
                type="number" 
                value={settings.basePricePerHour} 
                onChange={e => setSettings({...settings, basePricePerHour: e.target.value})}
                className="w-full border p-2 rounded"
              />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Save Changes
            </button>
          </form>
        </div>
      )}

      {activeTab === 'bikes' && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4">Bike</th>
                <th className="p-4">Renter</th>
                <th className="p-4">Price/hr</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {bikes.map(bike => (
                <tr key={bike._id} className="border-t">
                  <td className="p-4 font-medium">{bike.model}</td>
                  <td className="p-4">{bike.renter?.name}</td>
                  <td className="p-4">{bike.pricePerHour} TK</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${bike.availability ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {bike.availability ? 'Active' : 'Booked'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
