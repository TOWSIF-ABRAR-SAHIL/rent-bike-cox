import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/useAuth';

const store = {};
beforeEach(() => {
  Object.assign(store, {});
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, val) => { store[key] = val; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    },
    writable: true,
    configurable: true,
  });
});

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <div data-testid="token">{auth.token || 'null'}</div>
      <div data-testid="loading">{String(auth.loading)}</div>
      <button data-testid="login-btn" onClick={() => auth.login('fake-token')}>login</button>
      <button data-testid="logout-btn" onClick={auth.logout}>logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe('AuthProvider', () => {
  it('starts with null user and token', () => {
    renderProvider();
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  it('login stores token in localStorage', () => {
    renderProvider();
    act(() => { screen.getByTestId('login-btn').click(); });
    expect(store.token).toBe('fake-token');
  });

  it('logout clears token and user', () => {
    renderProvider();
    act(() => { screen.getByTestId('login-btn').click(); });
    act(() => { screen.getByTestId('logout-btn').click(); });
    expect(store.token).toBeUndefined();
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });
});
