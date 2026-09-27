import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import InvoiceView from '@/views/Invoice';

export default function InvoiceBookingIdPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['User', 'Renter', 'Admin']}>
      <InvoiceView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
