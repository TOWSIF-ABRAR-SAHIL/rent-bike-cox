import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import NotificationsView from '@/views/Notifications';

export default function NotificationsPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
      <NotificationsView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
