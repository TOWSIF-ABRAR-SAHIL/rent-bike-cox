import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

const Home = lazy(() => import('./pages/Home'));
const BikeDetails = lazy(() => import('./pages/BikeDetails'));
const RenterDashboard = lazy(() => import('./pages/RenterDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Invoice = lazy(() => import('./pages/Invoice'));
const PaymentFailed = lazy(() => import('./pages/PaymentFailed'));
const PaymentCancelled = lazy(() => import('./pages/PaymentCancelled'));
const Policies = lazy(() => import('./pages/Policies'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
    </div>
  </div>
);

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <div className="min-h-screen bg-[#0a0a0f] text-white">
              <Navbar />
              <main className="pt-16">
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/bike/:id" element={<BikeDetails />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/payment-failed" element={<PaymentFailed />} />
                    <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                    <Route path="/policies" element={<Policies />} />
                    <Route path="/checkout/:bikeId" element={
                      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                        <Checkout />
                      </ProtectedRoute>
                    } />
                    <Route path="/invoice/:bookingId" element={
                      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                        <Invoice />
                      </ProtectedRoute>
                    } />
                    <Route path="/renter-dashboard" element={
                      <ProtectedRoute roles={['Renter', 'Admin']}>
                        <RenterDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin-dashboard" element={
                      <ProtectedRoute roles={['Admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </div>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
