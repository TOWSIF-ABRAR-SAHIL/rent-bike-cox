import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "@/context/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { AuthContextValue } from "@/context/AuthContext";

vi.mock("@/context/useAuth", () => ({
  useAuth: vi.fn(),
}));

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
}));

vi.mock("@/components/PageSpinner", () => ({
  default: () => <div data-testid="spinner" />,
}));

function setupAuth(overrides: Partial<AuthContextValue>) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    token: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  replaceMock.mockClear();
});

describe("ProtectedRoute", () => {
  it("shows spinner when loading is true", () => {
    setupAuth({ loading: true });
    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("redirects to /login when no token", async () => {
    setupAuth({ token: null, user: null });
    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("redirects to /login when token but no user", async () => {
    setupAuth({ token: "abc", user: null });
    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("redirects to / when user role not in roles", async () => {
    setupAuth({
      token: "abc",
      user: { id: "1", role: "User", exp: 9999999999 },
      loading: false,
    });
    render(
      <ProtectedRoute roles={["Admin", "Renter"]}>
        <div>secret</div>
      </ProtectedRoute>
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders children when user role is in roles", () => {
    setupAuth({
      token: "abc",
      user: { id: "1", role: "Renter", exp: 9999999999 },
      loading: false,
    });
    render(
      <ProtectedRoute roles={["Admin", "Renter"]}>
        <div>secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
