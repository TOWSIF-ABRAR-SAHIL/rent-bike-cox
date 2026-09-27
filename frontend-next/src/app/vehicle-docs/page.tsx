import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import VehicleDocumentsView from '@/views/VehicleDocuments';

export default function VehicleDocsPage() {
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['Renter', 'Admin']}>
      <VehicleDocumentsView />
    </ProtectedRoute>
    </PageErrorBoundary>
  );
}
