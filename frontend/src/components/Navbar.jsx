import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Bike } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-xl font-bold text-blue-600">
              <Bike className="mr-2" />
              Rent Bike Cox's Bazar
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <Phone size={16} className="mr-1" />
              01891154443
            </div>
            <div className="flex items-center">
              <Phone size={16} className="mr-1" />
              01764466757
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {token ? (
              <button 
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
              >
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600">Login</Link>
                <Link to="/signup" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
