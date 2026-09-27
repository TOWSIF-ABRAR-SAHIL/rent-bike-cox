import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import FleetDashboardView from '@/views/FleetDashboard';

export default function FleetPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['Renter', 'Admin']}>
      <FleetDashboardView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
