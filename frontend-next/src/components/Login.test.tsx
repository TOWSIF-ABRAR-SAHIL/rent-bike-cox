import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import type { ReactNode } from "react";
import Login from "@/components/Login";

const { loginMock, pushMock, postMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  pushMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: { post: postMock },
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  loginMock.mockReset();
  pushMock.mockReset();
  postMock.mockReset();
});

async function submitCredentials(email = "rider@example.com", password = "wrong-password") {
  render(<Login />);
  fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: password } });
  // The rejection settles a microtask later; flush it inside act so the state update
  // the form performs is accounted for.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  });
}

describe("Login error messages", () => {
  it("shows the server message when the API rejects with 401", async () => {
    // The status a wrong password now returns; the axios interceptor must leave it
    // for the form (see api/axios.test.ts) rather than bounce to /login.
    postMock.mockRejectedValue({ response: { status: 401, data: { message: "Invalid credentials" } } });
    await submitCredentials();

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("falls back to a friendly message when a 401 carries none", async () => {
    postMock.mockRejectedValue({ response: { status: 401, data: {} } });
    await submitCredentials();

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });

  it("still explains a lockout (423)", async () => {
    postMock.mockRejectedValue({ response: { status: 423, data: { retryAfter: 900 } } });
    await submitCredentials();

    expect(await screen.findByText(/Account temporarily locked/)).toBeInTheDocument();
  });

  it("signs in and redirects on success", async () => {
    postMock.mockResolvedValue({
      data: { accessToken: "a", refreshToken: "r", user: { id: "1", role: "User" } },
    });
    await submitCredentials();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(loginMock).toHaveBeenCalledWith("a", "r", { id: "1", role: "User" });
  });
});
