import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuth } from '../context/useAuth';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../context/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock('./PageSpinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

function setupAuth(overrides) {
  useAuth.mockReturnValue({
    user: null,
    token: null,
    loading: false,
    ...overrides,
  });
}

describe('ProtectedRoute', () => {
  it('shows spinner when loading is true', () => {
    setupAuth({ loading: true });
    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('redirects to /login when no token', () => {
    setupAuth({ token: null, user: null });
    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('redirects to /login when token but no user', () => {
    setupAuth({ token: 'abc', user: null });
    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('redirects to / when user role not in roles', () => {
    setupAuth({ token: 'abc', user: { role: 'User' }, loading: false });
    render(
      <ProtectedRoute roles={['Admin', 'Renter']}>
        <div>secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders children when user role is in roles', () => {
    setupAuth({ token: 'abc', user: { role: 'Renter' }, loading: false });
    render(
      <ProtectedRoute roles={['Admin', 'Renter']}>
        <div>secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });
});
