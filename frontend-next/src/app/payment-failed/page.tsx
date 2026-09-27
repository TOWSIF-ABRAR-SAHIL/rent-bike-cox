import PageErrorBoundary from '@/components/PageErrorBoundary';
import PaymentFailedView from '@/views/PaymentFailed';

export default function PaymentFailedPage() {
  return (
    <PageErrorBoundary>
      <PaymentFailedView />
    </PageErrorBoundary>
  );
}
