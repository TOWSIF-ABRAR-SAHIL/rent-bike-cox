import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

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
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full" style={{ border: '2px solid var(--border-base)' }} />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
              <Navbar />
              <main className="pt-16">
                <Suspense fallback={<Loading />}>
                  <ErrorBoundary>
                    <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/bike/:id" element={<BikeDetails />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/payment-failed" element={<PaymentFailed />} />
                    <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                    <Route path="/my-bookings" element={
                      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                        <MyBookings />
                      </ProtectedRoute>
                    } />
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
                  </ErrorBoundary>
                </Suspense>
              </main>
              <Footer />
            </div>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
