import PageErrorBoundary from '@/components/PageErrorBoundary';
import CompareVehiclesView from '@/views/CompareVehicles';

export default function ComparePage() {
  return (
    <PageErrorBoundary>
      <CompareVehiclesView />
    </PageErrorBoundary>
  );
}
