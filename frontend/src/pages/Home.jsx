import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const Home = () => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from backend/api/bikes
    // Mocking for now to show the UI
    const mockBikes = [
      { _id: '1', model: 'Yamaha R15', brand: 'Yamaha', category: 'Bike', pricePerHour: 200, images: ['https://placehold.co/600x400?text=Yamaha+R15'] },
      { _id: '2', model: 'Honda CBR', brand: 'Honda', category: 'Bike', pricePerHour: 200, images: ['https://placehold.co/600x400?text=Honda+CBR'] },
      { _id: '3', model: 'Suzuki Gixxer', brand: 'Suzuki', category: 'Bike', pricePerHour: 200, images: ['https://placehold.co/600x400?text=Suzuki+Gixxer'] },
    ];
    setBikes(mockBikes);
    setLoading(false);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Available Bikes in Cox's Bazar</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {bikes.map((bike) => (
          <div key={bike._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <img src={bike.images[0]} alt={bike.model} className="w-full h-48 object-cover" />
            <div className="p-4">
              <h2 className="text-xl font-bold">{bike.model}</h2>
              <p className="text-gray-600">{bike.brand} - {bike.category}</p>
              <p className="text-blue-600 font-bold mt-2">{bike.pricePerHour} TK / Hour</p>
              <Link 
                to={`/bike/${bike._id}`} 
                className="mt-4 block text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
