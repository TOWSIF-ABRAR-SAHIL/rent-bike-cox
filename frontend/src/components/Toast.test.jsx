import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const Toast = ({ message, type, onClose }) => {
  return (
    <div role="alert" className={`toast toast-${type}`}>
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss notification">×</button>
    </div>
  );
};

describe('Toast component', () => {
  it('renders message', () => {
    render(<Toast message="Booking confirmed" type="success" onClose={() => {}} />);
    expect(screen.getByText('Booking confirmed')).toBeInTheDocument();
  });

  it('renders dismiss button with aria-label', () => {
    render(<Toast message="Error occurred" type="error" onClose={() => {}} />);
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });

  it('calls onClose when dismiss clicked', () => {
    const onClose = vi.fn();
    render(<Toast message="Done" type="success" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders with role="alert"', () => {
    render(<Toast message="Warning" type="warning" onClose={() => {}} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
