import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import MyBookingsView from '@/views/MyBookings';

export default function MyBookingsPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
      <MyBookingsView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
