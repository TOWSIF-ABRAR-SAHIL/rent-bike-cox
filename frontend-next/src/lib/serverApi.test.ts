import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { serverGet, API_BASE } from "@/lib/serverApi";

describe("serverApi", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes the configured API base", () => {
    expect(API_BASE).toContain("/api");
  });

  it("fetches and returns JSON on success", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ bikes: [] }),
    });
    const data = await serverGet<{ bikes: unknown[] }>("/dashboard/bikes/available");
    expect(data).toEqual({ bikes: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { next?: { revalidate?: number } }];
    expect(url).toBe(`${API_BASE}/dashboard/bikes/available`);
    expect(init.next).toEqual({ revalidate: 60 });
  });

  it("honors a custom revalidate window", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    await serverGet("/content", { revalidate: 300 });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit & { next?: { revalidate?: number } }];
    expect(init.next).toEqual({ revalidate: 300 });
  });

  it("throws on non-OK responses", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    await expect(serverGet("/dashboard/bikes/available")).rejects.toThrow("503");
  });
});
