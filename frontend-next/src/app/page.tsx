import PageErrorBoundary from '@/components/PageErrorBoundary';
import HomeView from '@/views/Home';
import { serverGetOrNull } from '@/lib/serverApi';
import { normalizeFaqs } from '@/lib/faqContent';
import type { Bike, BikeCategory, Faq, ReviewStats } from '@/types';

// Storefront data is public and changes slowly: render it into the HTML and let
// ISR refresh it in the background instead of shipping an empty shell.
export const revalidate = 60;

export default async function HomePage() {
  const [bikes, categories, faqPayload] = await Promise.all([
    serverGetOrNull<Bike[]>('/dashboard/bikes/available', { revalidate: 60 }, 'home bikes'),
    serverGetOrNull<BikeCategory[]>('/dashboard/categories', { revalidate: 300 }, 'home categories'),
    serverGetOrNull<unknown>('/faqs', { revalidate: 300 }, 'home faqs'),
  ]);

  const ratings = bikes?.length
    ? await serverGetOrNull<Record<string, ReviewStats>>(
        `/reviews/stats?bikeIds=${encodeURIComponent(bikes.map((b) => b._id).join(','))}`,
        { revalidate: 120 },
        'home ratings'
      )
    : null;

  const faqs: Faq[] | null = faqPayload ? normalizeFaqs(faqPayload).faqs.slice(0, 6) : null;

  return (
    <PageErrorBoundary>
      <HomeView
        initialBikes={bikes}
        initialCategories={categories}
        initialFaqs={faqs}
        initialRatings={ratings}
      />
    </PageErrorBoundary>
  );
}
