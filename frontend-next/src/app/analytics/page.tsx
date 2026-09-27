import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import AnalyticsDashboardView from '@/views/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['Admin']}>
      <AnalyticsDashboardView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
