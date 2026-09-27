import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import RefundManagementView from '@/views/RefundManagement';

export default function RefundsPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['Admin']}>
      <RefundManagementView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
