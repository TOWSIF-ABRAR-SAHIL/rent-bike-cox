import PageErrorBoundary from '@/components/PageErrorBoundary';
import ContactView from '@/views/Contact';

export default function ContactPage() {
  return (
    <PageErrorBoundary>
      <ContactView />
    </PageErrorBoundary>
  );
}
