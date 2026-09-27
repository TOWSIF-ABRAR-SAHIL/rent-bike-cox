import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDashboardView from '@/views/AdminDashboard';

export default function AdminDashboardPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['Admin']}>
      <AdminDashboardView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
