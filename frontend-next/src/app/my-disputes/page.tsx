import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import MyDisputesView from '@/views/MyDisputes';

export default function MyDisputesPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
      <MyDisputesView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
