import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PageErrorBoundary from './components/PageErrorBoundary';
import PageSpinner from './components/PageSpinner';
import { CompareProvider } from './context/CompareContext';
import { WishlistProvider } from './context/WishlistContext';
import CompareBar from './components/CompareBar';
import BottomNav from './components/BottomNav';
import WhatsAppButton from './components/WhatsAppButton';

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
const ZoneExplorer = lazy(() => import('./pages/ZoneExplorer'));
const Profile = lazy(() => import('./pages/Profile'));
const MyDisputes = lazy(() => import('./pages/MyDisputes'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const RefundManagement = lazy(() => import('./pages/RefundManagement'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));
const CompareVehicles = lazy(() => import('./pages/CompareVehicles'));
const WishlistPage = lazy(() => import('./pages/Wishlist'));
const FAQPage = lazy(() => import('./pages/FAQ'));
const ContactPage = lazy(() => import('./pages/Contact'));
const AdminNotificationsPage = lazy(() => import('./pages/AdminNotificationsPage'));

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CompareProvider>
              <WishlistProvider>
                <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden">
              <Navbar />
              <main className="pt-16">
                <Suspense fallback={<PageSpinner />}>
                  <ErrorBoundary>
                    <Routes>
                    <Route path="/" element={<PageErrorBoundary><Home /></PageErrorBoundary>} />
                    <Route path="/bike/:id" element={<PageErrorBoundary><BikeDetails /></PageErrorBoundary>} />
                    <Route path="/login" element={<PageErrorBoundary><Login /></PageErrorBoundary>} />
                    <Route path="/signup" element={<PageErrorBoundary><Signup /></PageErrorBoundary>} />
                    <Route path="/forgot-password" element={<PageErrorBoundary><ForgotPassword /></PageErrorBoundary>} />
                    <Route path="/payment-failed" element={<PageErrorBoundary><PaymentFailed /></PageErrorBoundary>} />
                    <Route path="/payment-cancelled" element={<PageErrorBoundary><PaymentCancelled /></PageErrorBoundary>} />
                    <Route path="/my-bookings" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                          <MyBookings />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/policies" element={<PageErrorBoundary><Policies /></PageErrorBoundary>} />
                    <Route path="/privacy" element={<PageErrorBoundary><PrivacyPolicy /></PageErrorBoundary>} />
                    <Route path="/terms" element={<PageErrorBoundary><TermsOfService /></PageErrorBoundary>} />
                    <Route path="/checkout/:bikeId" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                          <Checkout />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/invoice/:bookingId" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                          <Invoice />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/renter-dashboard" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['Renter', 'Admin']}>
                          <RenterDashboard />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/admin-dashboard" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['Admin']}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/fleet" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['Renter', 'Admin']}>
                          <FleetDashboard />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/search" element={<PageErrorBoundary><AdvancedSearch /></PageErrorBoundary>} />
                    <Route path="/analytics" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['Admin']}>
                          <AnalyticsDashboard />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/notifications" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                          <Notifications />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/seasonal-pricing" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['Admin']}>
                          <SeasonalPricingManager />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/refunds" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['Admin']}>
                          <RefundManagement />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/vehicle-docs" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['Renter', 'Admin']}>
                          <VehicleDocuments />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/notification-settings" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                          <NotificationPreferences />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/my-disputes" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                          <MyDisputes />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/profile" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                          <Profile />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/change-password" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                          <ChangePassword />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/zones" element={<PageErrorBoundary><ZoneExplorer /></PageErrorBoundary>} />
                    <Route path="/compare" element={<PageErrorBoundary><CompareVehicles /></PageErrorBoundary>} />
                    <Route path="/wishlist" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
                          <WishlistPage />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="/faq" element={<PageErrorBoundary><FAQPage /></PageErrorBoundary>} />
                    <Route path="/contact" element={<PageErrorBoundary><ContactPage /></PageErrorBoundary>} />
                    <Route path="/admin/notifications" element={
                      <PageErrorBoundary>
                        <ProtectedRoute roles={['Admin']}>
                          <AdminNotificationsPage />
                        </ProtectedRoute>
                      </PageErrorBoundary>
                    } />
                    <Route path="*" element={<PageErrorBoundary><NotFound /></PageErrorBoundary>} />
                    </Routes>
                  </ErrorBoundary>
                </Suspense>
              </main>
              <Footer />
              <BottomNav />
              <WhatsAppButton />
              <CompareBar />
            </div>
              </WishlistProvider>
            </CompareProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
