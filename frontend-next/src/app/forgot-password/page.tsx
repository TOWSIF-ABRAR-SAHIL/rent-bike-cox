import PageErrorBoundary from '@/components/PageErrorBoundary';
import ForgotPasswordView from '@/views/ForgotPassword';

export default function ForgotPasswordPage() {
  return (
    <PageErrorBoundary>
      <ForgotPasswordView />
    </PageErrorBoundary>
  );
}
