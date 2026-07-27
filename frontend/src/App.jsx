import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PageSpinner from './components/PageSpinner';

const Home = lazy(() => import('./pages/Home'));
const BikeDetails = lazy(() => import('./pages/BikeDetails'));
const RenterDashboard = lazy(() => import('./pages/RenterDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Invoice = lazy(() => import('./pages/Invoice'));
const PaymentFailed = lazy(() => import('./pages/PaymentFailed'));
const PaymentCancelled = lazy(() => import('./pages/PaymentCancelled'));
const Policies = lazy(() => import('./pages/Policies'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const FleetDashboard = lazy(() => import('./pages/FleetDashboard'));
const AdvancedSearch = lazy(() => import('./pages/AdvancedSearch'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SeasonalPricingManager = lazy(() => import('./pages/SeasonalPricingManager'));
const VehicleDocuments = lazy(() => import('./pages/VehicleDocuments'));
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden">
              <Navbar />
              <main className="pt-16">
                <Suspense fallback={<PageSpinner />}>
                  <ErrorBoundary>
                    <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/bike/:id" element={<BikeDetails />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/payment-failed" element={<PaymentFailed />} />
                    <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                    <Route path="/my-bookings" element={
                      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                        <MyBookings />
                      </ProtectedRoute>
                    } />
                    <Route path="/policies" element={<Policies />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
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
                    <Route path="/fleet" element={
                      <ProtectedRoute roles={['Renter', 'Admin']}>
                        <FleetDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/search" element={<AdvancedSearch />} />
                    <Route path="/analytics" element={
                      <ProtectedRoute roles={['Admin']}>
                        <AnalyticsDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/notifications" element={
                      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                        <Notifications />
                      </ProtectedRoute>
                    } />
                    <Route path="/seasonal-pricing" element={
                      <ProtectedRoute roles={['Admin']}>
                        <SeasonalPricingManager />
                      </ProtectedRoute>
                    } />
                    <Route path="/vehicle-docs" element={
                      <ProtectedRoute roles={['Renter', 'Admin']}>
                        <VehicleDocuments />
                      </ProtectedRoute>
                    } />
                    <Route path="/notification-settings" element={
                      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                        <NotificationPreferences />
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
