import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'User',
    nid: '', license: '', phoneNumber: '', address: ''
  });
  const [nidFile, setNidFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });
    
    if (nidFile) formDataToSend.append('nidImage', nidFile);
    if (licenseFile) formDataToSend.append('licenseImage', licenseFile);

    try {
      const response = await api.post('/auth/register', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      localStorage.setItem('token', response.data.token);
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>
        <div className="space-y-4">
          <input type="text" name="name" placeholder="Full Name" onChange={handleChange} className="w-full p-2 border rounded" required />
          <input type="email" name="email" placeholder="Email" onChange={handleChange} className="w-full p-2 border rounded" required />
          <input type="password" name="password" placeholder="Password" onChange={handleChange} className="w-full p-2 border rounded" required />
          <select name="role" onChange={handleChange} className="w-full p-2 border rounded">
            <option value="User">User (Customer)</option>
            <option value="Renter">Renter (Bike Owner)</option>
          </select>
          <input type="text" name="phoneNumber" placeholder="Phone Number" onChange={handleChange} className="w-full p-2 border rounded" required />
          <input type="text" name="nid" placeholder="NID Number" onChange={handleChange} className="w-full p-2 border rounded" required />
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">NID Copy (Mandatory)</label>
            <input type="file" onChange={(e) => setNidFile(e.target.files[0])} className="w-full p-1 text-sm border rounded" required />
          </div>
          <input type="text" name="license" placeholder="Driving License Number" onChange={handleChange} className="w-full p-2 border rounded" required />
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">License Copy (Mandatory)</label>
            <input type="file" onChange={(e) => setLicenseFile(e.target.files[0])} className="w-full p-1 text-sm border rounded" required />
          </div>
          <textarea name="address" placeholder="Address" onChange={handleChange} className="w-full p-2 border rounded"></textarea>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Sign Up</button>
        </div>
      </form>
    </div>
  );
};

export default Signup;
