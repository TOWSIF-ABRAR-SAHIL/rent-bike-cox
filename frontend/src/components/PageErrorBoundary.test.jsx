import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PageErrorBoundary from '../components/PageErrorBoundary';

const ThrowError = () => {
  throw new Error('Page crashed');
};

describe('PageErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <PageErrorBoundary>
        <div>Page content</div>
      </PageErrorBoundary>
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Page Error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('shows custom fallback message', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PageErrorBoundary fallbackMessage="Custom error message">
        <ThrowError />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('retry button resets error state', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    const ConditionalThrow = () => {
      if (shouldThrow) throw new Error('Error');
      return <div>Recovered</div>;
    };

    const { rerender } = render(
      <PageErrorBoundary>
        <ConditionalThrow />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Page Error')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByText('Try Again'));

    rerender(
      <PageErrorBoundary>
        <ConditionalThrow />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Recovered')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
