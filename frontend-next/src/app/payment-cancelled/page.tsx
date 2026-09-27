import PageErrorBoundary from '@/components/PageErrorBoundary';
import PaymentCancelledView from '@/views/PaymentCancelled';

export default function PaymentCancelledPage() {
  return (
    <PageErrorBoundary>
      <PaymentCancelledView />
    </PageErrorBoundary>
  );
}
