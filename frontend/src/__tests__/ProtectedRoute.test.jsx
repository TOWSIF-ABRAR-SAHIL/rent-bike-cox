import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from '../components/ProtectedRoute';

vi.mock('../context/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/useAuth';

beforeEach(() => {
  vi.clearAllMocks();
});

function renderRoute(overrides = {}) {
  const context = { user: null, token: null, loading: false, ...overrides };
  useAuth.mockReturnValue(context);

  return render(
    <MemoryRouter>
      <ProtectedRoute roles={overrides.allowedRoles}>
        <div>protected content</div>
      </ProtectedRoute>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    renderRoute({ user: { role: 'User' }, token: 'valid-token' });
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('redirects to /login when no token', () => {
    renderRoute({ user: null, token: null });
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('redirects to / when role not allowed', () => {
    renderRoute({ user: { role: 'User' }, token: 'valid-token', allowedRoles: ['Admin'] });
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('allows access when role matches', () => {
    renderRoute({ user: { role: 'Admin' }, token: 'valid-token', allowedRoles: ['Admin'] });
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('allows access when role in allowed list', () => {
    renderRoute({ user: { role: 'Renter' }, token: 'valid-token', allowedRoles: ['Admin', 'Renter'] });
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    renderRoute({ user: null, token: null, loading: true });
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
