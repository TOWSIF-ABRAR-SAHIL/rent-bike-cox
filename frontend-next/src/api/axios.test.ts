import { describe, it, expect, vi, beforeEach } from "vitest";

const { requestMock, responseUseMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  responseUseMock: vi.fn(),
}));
const postMock = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("axios", () => ({
  default: {
    // The instance is callable — the refresh path replays the request with api(config).
    create: () =>
      Object.assign(requestMock, {
        request: requestMock,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: responseUseMock },
        },
      }),
    post: postMock.post,
    defaults: { headers: { common: {} } },
  },
}));

let apiWithRetry: (
  config: Record<string, unknown>,
  retries?: number,
  delay?: number
) => Promise<unknown>;
let isCredentialRequest: (url?: string) => boolean;

beforeEach(async () => {
  requestMock.mockReset();
  responseUseMock.mockReset();
  postMock.post.mockReset();
  localStorage.clear();
  vi.useFakeTimers();
  vi.resetModules();
  const mod = await import("@/api/axios");
  apiWithRetry = mod.apiWithRetry;
  isCredentialRequest = mod.isCredentialRequest;
});

describe("apiWithRetry", () => {
  it("returns response on success", async () => {
    const mockResponse = { data: { ok: true } };
    requestMock.mockResolvedValueOnce(mockResponse);
    const result = await apiWithRetry({ url: "/test" });
    expect(result).toEqual(mockResponse);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("retries on network error (no response)", async () => {
    const mockResponse = { data: { ok: true } };
    requestMock.mockRejectedValueOnce(new Error("Network Error"));
    requestMock.mockResolvedValueOnce(mockResponse);

    const promise = apiWithRetry({ url: "/test" }, 2, 10);
    await vi.advanceTimersByTimeAsync(10);
    const result = await promise;

    expect(result).toEqual(mockResponse);
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 error", async () => {
    const mockResponse = { data: { ok: true } };
    requestMock.mockRejectedValueOnce({ response: { status: 500 } });
    requestMock.mockResolvedValueOnce(mockResponse);

    const promise = apiWithRetry({ url: "/test" }, 2, 10);
    await vi.advanceTimersByTimeAsync(10);
    const result = await promise;

    expect(result).toEqual(mockResponse);
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on 400 error", async () => {
    const error = { response: { status: 400 } };
    requestMock.mockRejectedValueOnce(error);

    await expect(apiWithRetry({ url: "/test" }, 2, 10)).rejects.toMatchObject({
      response: { status: 400 },
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("throws after all retries exhausted", async () => {
    requestMock.mockRejectedValue(new Error("Network Error"));

    const promise = apiWithRetry({ url: "/test" }, 1, 10);
    const assertion = expect(promise).rejects.toThrow("Network Error");
    await vi.advanceTimersByTimeAsync(30);
    await assertion;
    expect(requestMock).toHaveBeenCalledTimes(2);
  });
});

/**
 * A 401 from the login form is a rejected credential, not an expired session. Treating
 * it as an expiry replayed the failing login after a refresh, and a failed refresh
 * hard-navigated back to /login before the form could show the error message.
 */
describe("401 handling", () => {
  const rejectHandler = (): ((error: unknown) => Promise<unknown>) =>
    responseUseMock.mock.calls[0][1] as (error: unknown) => Promise<unknown>;

  it("leaves a credential 401 alone: no refresh, no cleared session", async () => {
    const error = {
      config: { url: "/auth/login" },
      response: { status: 401, data: { message: "Invalid credentials" } },
    };
    localStorage.setItem("refreshToken", "stale-refresh");

    await expect(rejectHandler()(error)).rejects.toBe(error);

    expect(postMock.post).not.toHaveBeenCalled();
    expect(localStorage.getItem("refreshToken")).toBe("stale-refresh");
  });

  it("still refreshes a 401 from a normal request", async () => {
    localStorage.setItem("accessToken", "old-access");
    localStorage.setItem("refreshToken", "refresh-1");
    postMock.post.mockResolvedValue({ data: { accessToken: "new-access", refreshToken: "refresh-2" } });
    requestMock.mockResolvedValueOnce({ data: { ok: true } });

    await rejectHandler()({
      config: { url: "/booking/mine", headers: {} },
      response: { status: 401, data: {} },
    });

    expect(postMock.post).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("accessToken")).toBe("new-access");
  });

  it("recognises only the credential endpoints", () => {
    expect(isCredentialRequest("/auth/login")).toBe(true);
    expect(isCredentialRequest("/auth/register")).toBe(true);
    expect(isCredentialRequest("/auth/profile")).toBe(false);
    expect(isCredentialRequest(undefined)).toBe(false);
  });
});
