import PageErrorBoundary from '@/components/PageErrorBoundary';
import PoliciesView from '@/views/Policies';

export default function PoliciesPage() {
  return (
    <PageErrorBoundary>
      <PoliciesView />
    </PageErrorBoundary>
  );
}
