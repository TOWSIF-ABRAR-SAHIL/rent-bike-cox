import PageErrorBoundary from '@/components/PageErrorBoundary';
import SignupView from '@/components/Signup';

export default function SignupPage() {
  return (
    <PageErrorBoundary>
      <SignupView />
    </PageErrorBoundary>
  );
}
