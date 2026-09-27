import PageErrorBoundary from '@/components/PageErrorBoundary';
import FAQView from '@/views/FAQ';

export default function FaqPage() {
  return (
    <PageErrorBoundary>
      <FAQView />
    </PageErrorBoundary>
  );
}
