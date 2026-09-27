import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import WishlistView from '@/views/Wishlist';

export default function WishlistPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
      <WishlistView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
