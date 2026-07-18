import { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { UserPlus, User, Mail, Lock, Phone, CreditCard, MapPin } from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'User',
    nid: '', license: '', phoneNumber: '', address: ''
  });
  const [nidFile, setNidFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => formDataToSend.append(key, formData[key]));
    if (nidFile) formDataToSend.append('nidImage', nidFile);
    if (licenseFile) formDataToSend.append('licenseImage', licenseFile);

    try {
      const response = await api.post('/auth/register', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      login(response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 gradient-hero relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-[80px]" />
      </div>
      <div className="w-full max-w-lg animate-slide-up relative">
        <div className="glass rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <UserPlus size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Create Account</h2>
            <p className="text-gray-400 text-sm mt-1">Join Rent Bike Cox's Bazar</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" name="name" placeholder="Full Name" onChange={handleChange} className="input-dark !pl-10 !py-2.5 text-sm" required />
              </div>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" name="email" placeholder="Email" onChange={handleChange} className="input-dark !pl-10 !py-2.5 text-sm" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" name="password" placeholder="Password" onChange={handleChange} className="input-dark !pl-10 !py-2.5 text-sm" required />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" name="phoneNumber" placeholder="Phone Number" onChange={handleChange} className="input-dark !pl-10 !py-2.5 text-sm" required />
              </div>
            </div>

            <select name="role" onChange={handleChange} className="input-dark !py-2.5 text-sm bg-white/5">
              <option value="User" className="bg-[#111118]">User (Customer)</option>
              <option value="Renter" className="bg-[#111118]">Renter (Bike Owner)</option>
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" name="nid" placeholder="NID Number" onChange={handleChange} className="input-dark !pl-10 !py-2.5 text-sm" required />
              </div>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" name="license" placeholder="License Number" onChange={handleChange} className="input-dark !pl-10 !py-2.5 text-sm" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">NID Copy</label>
                <input type="file" onChange={(e) => setNidFile(e.target.files[0])} className="input-dark !py-2 !px-3 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-500/10 file:text-cyan-400 hover:file:bg-primary-500/20" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">License Copy</label>
                <input type="file" onChange={(e) => setLicenseFile(e.target.files[0])} className="input-dark !py-2 !px-3 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-500/10 file:text-cyan-400 hover:file:bg-primary-500/20" required />
              </div>
            </div>

            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-3 text-gray-500" />
              <textarea name="address" placeholder="Address" onChange={handleChange} className="input-dark !pl-10 !py-2.5 text-sm min-h-[60px] resize-none"></textarea>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 font-semibold hover:text-cyan-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
