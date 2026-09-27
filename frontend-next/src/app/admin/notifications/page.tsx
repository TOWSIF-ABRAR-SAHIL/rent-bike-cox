import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNotificationsPageView from '@/views/AdminNotificationsPage';

export default function AdminNotificationsPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['Admin']}>
      <AdminNotificationsPageView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
