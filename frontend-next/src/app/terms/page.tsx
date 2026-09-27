import PageErrorBoundary from '@/components/PageErrorBoundary';
import TermsOfServiceView from '@/views/TermsOfService';

export default function TermsPage() {
  return (
    <PageErrorBoundary>
      <TermsOfServiceView />
    </PageErrorBoundary>
  );
}
