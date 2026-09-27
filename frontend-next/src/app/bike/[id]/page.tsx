import PageErrorBoundary from '@/components/PageErrorBoundary';
import BikeDetailsView from '@/views/BikeDetails';

export default function BikeIdPage() {
  return (
    <PageErrorBoundary>
      <BikeDetailsView />
    </PageErrorBoundary>
  );
}
