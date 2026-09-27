import PageErrorBoundary from '@/components/PageErrorBoundary';
import LoginView from '@/components/Login';

export default function LoginPage() {
  return (
    <PageErrorBoundary>
      <LoginView />
    </PageErrorBoundary>
  );
}
