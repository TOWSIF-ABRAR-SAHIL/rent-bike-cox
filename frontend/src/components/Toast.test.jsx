import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, ToastContext } from './Toast';

function ToastConsumer({ onReady }) {
  return (
    <ToastContext.Consumer>
      {value => {
        onReady(value);
        return <div>child content</div>;
      }}
    </ToastContext.Consumer>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('renders children', () => {
    let ctxValue;
    render(
      <ToastProvider>
        <ToastConsumer onReady={v => (ctxValue = v)} />
      </ToastProvider>
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(ctxValue).toHaveProperty('addToast');
  });

  it('shows a toast with the message on addToast', () => {
    let addToast;
    render(
      <ToastProvider>
        <ToastConsumer onReady={v => (addToast = v.addToast)} />
      </ToastProvider>
    );

    act(() => {
      addToast('Booking confirmed', 'success');
    });

    expect(screen.getByText('Booking confirmed')).toBeInTheDocument();
  });

  it('dismiss button removes the toast', () => {
    let addToast;
    render(
      <ToastProvider>
        <ToastConsumer onReady={v => (addToast = v.addToast)} />
      </ToastProvider>
    );

    act(() => {
      addToast('Booking confirmed', 'success');
    });

    expect(screen.getByText('Booking confirmed')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss notification'));

    expect(screen.queryByText('Booking confirmed')).not.toBeInTheDocument();
  });

  it('toasts auto-dismiss after duration', () => {
    let addToast;
    render(
      <ToastProvider>
        <ToastConsumer onReady={v => (addToast = v.addToast)} />
      </ToastProvider>
    );

    act(() => {
      addToast('Auto dismiss', 'info', 2000);
    });

    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });
});
