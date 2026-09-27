import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import NotificationPreferencesView from '@/views/NotificationPreferences';

export default function NotificationSettingsPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
      <NotificationPreferencesView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
