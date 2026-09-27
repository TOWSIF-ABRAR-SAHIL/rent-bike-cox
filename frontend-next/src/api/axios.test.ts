import { describe, it, expect, vi, beforeEach } from "vitest";

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
const postMock = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("axios", () => ({
  default: {
    create: () => ({
      request: requestMock,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
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

beforeEach(async () => {
  requestMock.mockReset();
  vi.useFakeTimers();
  vi.resetModules();
  const mod = await import("@/api/axios");
  apiWithRetry = mod.apiWithRetry;
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
