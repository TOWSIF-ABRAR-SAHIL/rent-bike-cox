import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import SeasonalPricingManagerView from '@/views/SeasonalPricingManager';

export default function SeasonalPricingPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['Admin']}>
      <SeasonalPricingManagerView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
