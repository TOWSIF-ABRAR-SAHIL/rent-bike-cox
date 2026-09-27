'use client';

import PageErrorBoundary from '@/components/PageErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import VehicleHistoryView from '@/views/VehicleHistory';
import { useParams, useRouter } from 'next/navigation';

export default function VehicleHistoryBikeIdPage() {
  const { bikeId } = useParams();
  const router = useRouter();
  const id = Array.isArray(bikeId) ? bikeId[0] : bikeId;
  return (
    <PageErrorBoundary>
      <ProtectedRoute roles={['Renter', 'Admin']}>
        <VehicleHistoryView bikeId={id} onClose={() => router.back()} />
      </ProtectedRoute>
    </PageErrorBoundary>
  );
}
