import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import RenterDashboardView from '@/views/RenterDashboard';

export default function RenterDashboardPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['Renter', 'Admin']}>
      <RenterDashboardView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
