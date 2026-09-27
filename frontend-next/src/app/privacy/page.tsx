import PageErrorBoundary from '@/components/PageErrorBoundary';
import PrivacyPolicyView from '@/views/PrivacyPolicy';

export default function PrivacyPage() {
  return (
    <PageErrorBoundary>
      <PrivacyPolicyView />
    </PageErrorBoundary>
  );
}
