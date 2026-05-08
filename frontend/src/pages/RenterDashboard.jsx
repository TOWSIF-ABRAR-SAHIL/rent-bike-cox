import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { PlusCircle, Bike as BikeIcon } from 'lucide-react';

const RenterDashboard = () => {
  const [bikes, setBikes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newBike, setNewBike] = useState({
    model: '', brand: '', category: 'Bike', description: '', pricePerHour: 200, images: []
  });
  const [bikeFiles, setBikeFiles] = useState([]);

  useEffect(() => {
    fetchMyBikes();
  }, []);

  const fetchMyBikes = async () => {
    try {
      const res = await api.get('/dashboard/my-bikes');
      setBikes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    Object.keys(newBike).forEach(key => {
      formDataToSend.append(key, newBike[key]);
    });
    
    Array.from(bikeFiles).forEach(file => {
      formDataToSend.append('bikeImages', file);
    });

    try {
      await api.post('/dashboard/bikes', formDataToSend, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });
      setShowForm(false);
      fetchMyBikes();
    } catch (err) {
      alert('Failed to add bike');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Renter Dashboard</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center hover:bg-blue-700"
        >
          <PlusCircle className="mr-2" size={20} /> Add New Bike
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Model" className="border p-2 rounded" onChange={e => setNewBike({...newBike, model: e.target.value})} required />
          <input type="text" placeholder="Brand" className="border p-2 rounded" onChange={e => setNewBike({...newBike, brand: e.target.value})} required />
          <select className="border p-2 rounded" onChange={e => setNewBike({...newBike, category: e.target.value})}>
            <option value="Bike">Bike</option>
            <option value="Car">Car</option>
          </select>
          <input type="number" placeholder="Price Per Hour" className="border p-2 rounded" onChange={e => setNewBike({...newBike, pricePerHour: e.target.value})} required />
          <textarea placeholder="Description" className="border p-2 rounded md:col-span-2" onChange={e => setNewBike({...newBike, description: e.target.value})} required />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Bike Photos (Multi-angle)</label>
            <input 
              type="file" 
              multiple 
              className="border p-2 rounded w-full" 
              onChange={e => setBikeFiles(e.target.files)}
            />
          </div>
          <button type="submit" className="bg-green-600 text-white p-2 rounded md:col-span-2 hover:bg-green-700">Save Bike</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bikes.map(bike => (
          <div key={bike._id} className="bg-white p-4 rounded shadow flex items-center">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <BikeIcon className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{bike.model}</h3>
              <p className="text-gray-500">{bike.brand} - {bike.pricePerHour} TK/hr</p>
              <p className={`text-sm ${bike.availability ? 'text-green-600' : 'text-red-600'}`}>
                {bike.availability ? 'Available' : 'Booked'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RenterDashboard;
