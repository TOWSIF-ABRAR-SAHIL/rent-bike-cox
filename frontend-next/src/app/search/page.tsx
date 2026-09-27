import PageErrorBoundary from '@/components/PageErrorBoundary';
import { Suspense } from 'react';
import PageSpinner from '@/components/PageSpinner';
import AdvancedSearchView from '@/views/AdvancedSearch';

export default function SearchPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<PageSpinner />}>
      <AdvancedSearchView />
    </Suspense>
    </PageErrorBoundary>
  );
}
