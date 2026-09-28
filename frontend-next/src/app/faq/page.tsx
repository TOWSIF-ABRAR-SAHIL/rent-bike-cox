import PageErrorBoundary from '@/components/PageErrorBoundary';
import FAQView from '@/views/FAQ';
import { serverGetOrNull } from '@/lib/serverApi';
import { normalizeFaqs } from '@/lib/faqContent';

// FAQ copy is edited rarely in the admin panel; an hour of ISR is plenty.
export const revalidate = 3600;

export default async function FaqPage() {
  const payload = await serverGetOrNull<unknown>('/faqs', { revalidate: 3600 }, 'faqs');
  const { categories, faqs } = payload ? normalizeFaqs(payload) : { categories: [], faqs: [] };

  return (
    <PageErrorBoundary>
      <FAQView
        initialFaqs={payload ? faqs : null}
        initialCategories={payload ? categories : null}
      />
    </PageErrorBoundary>
  );
}
