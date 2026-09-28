import PageErrorBoundary from '@/components/PageErrorBoundary';
import BikeDetailsView from '@/views/BikeDetails';
import { serverGetOrNull } from '@/lib/serverApi';
import type { Bike, Review, ReviewStats } from '@/types';

// Prices and availability move, so keep the window short; the route stays
// dynamic (no generateStaticParams) and is rendered on demand.
export const revalidate = 60;

interface ReviewsResponse {
  reviews?: Review[];
  stats?: ReviewStats;
  page?: number;
  pages?: number;
}

export default async function BikeIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = encodeURIComponent(id);

  const bike = await serverGetOrNull<Bike>(`/dashboard/bikes/${path}`, { revalidate: 60 }, 'bike');

  const reviews = bike
    ? await serverGetOrNull<ReviewsResponse>(
        `/reviews/${path}?page=1&limit=5&sort=newest`,
        { revalidate: 60 },
        'bike reviews'
      )
    : null;

  return (
    <PageErrorBoundary>
      <BikeDetailsView
        initialBike={bike}
        initialReviews={reviews?.reviews ?? null}
        initialReviewStats={reviews?.stats ?? null}
        initialReviewPages={reviews?.pages ?? null}
      />
    </PageErrorBoundary>
  );
}
