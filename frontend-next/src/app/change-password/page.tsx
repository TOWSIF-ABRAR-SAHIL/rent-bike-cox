import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChangePasswordView from '@/views/ChangePassword';

export default function ChangePasswordPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
      <ChangePasswordView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
