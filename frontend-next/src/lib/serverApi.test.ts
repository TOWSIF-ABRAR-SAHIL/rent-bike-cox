import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { serverGet, serverGetOrNull, API_BASE } from "@/lib/serverApi";

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

  describe("serverGetOrNull", () => {
    it("returns the payload on success", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ categories: [], faqs: {} }),
      });
      await expect(serverGetOrNull("/faqs", { revalidate: 300 })).resolves.toEqual({
        categories: [],
        faqs: {},
      });
    });

    it("resolves null instead of rejecting when the API is unreachable", async () => {
      // A page prefetch must never fail a build or a render because the API is down.
      fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED 127.0.0.1:5000"));
      await expect(
        serverGetOrNull("/dashboard/bikes/available", undefined, "home bikes")
      ).resolves.toBeNull();
    });

    it("resolves null on non-OK responses too", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
      await expect(serverGetOrNull("/reviews/stats?bikeIds=1")).resolves.toBeNull();
    });

    it("does not log during tests", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      fetchMock.mockRejectedValueOnce(new Error("offline"));
      await serverGetOrNull("/faqs");
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
