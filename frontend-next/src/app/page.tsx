import PageErrorBoundary from '@/components/PageErrorBoundary';
import HomeView from '@/views/Home';

export default function HomePage() {
  return (
    <PageErrorBoundary>
      <HomeView />
    </PageErrorBoundary>
  );
}
