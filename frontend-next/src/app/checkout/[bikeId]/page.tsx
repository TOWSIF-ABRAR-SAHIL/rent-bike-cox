import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import CheckoutView from '@/views/Checkout';

export default function CheckoutBikeIdPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
      <CheckoutView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
