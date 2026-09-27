import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProfileView from '@/views/Profile';

export default function ProfilePage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
      <ProfileView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
