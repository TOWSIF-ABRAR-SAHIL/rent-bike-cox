import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiInstance = vi.fn();
apiInstance.interceptors = {
  request: { use: vi.fn() },
  response: { use: vi.fn() },
};

vi.mock('axios', () => {
  const mockAxios = vi.fn(() => ({ data: {} }));
  mockAxios.create = vi.fn(() => apiInstance);
  mockAxios.post = vi.fn();
  mockAxios.defaults = { headers: { common: {} } };
  return { default: mockAxios };
});

let apiWithRetry;

beforeEach(async () => {
  apiInstance.mockReset();
  vi.useFakeTimers();
  vi.resetModules();
  const mod = await import('../api/axios');
  apiWithRetry = mod.apiWithRetry;
});

describe('apiWithRetry', () => {
  it('returns response on success', async () => {
    const mockResponse = { data: { ok: true } };
    apiInstance.mockResolvedValueOnce(mockResponse);
    const result = await apiWithRetry({ url: '/test' });
    expect(result).toEqual(mockResponse);
    expect(apiInstance).toHaveBeenCalledTimes(1);
  });

  it('retries on network error (no response)', async () => {
    const mockResponse = { data: { ok: true } };
    apiInstance.mockRejectedValueOnce(new Error('Network Error'));
    apiInstance.mockResolvedValueOnce(mockResponse);

    const promise = apiWithRetry({ url: '/test' }, 2, 10);
    await vi.advanceTimersByTimeAsync(10);
    const result = await promise;

    expect(result).toEqual(mockResponse);
    expect(apiInstance).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 error', async () => {
    const mockResponse = { data: { ok: true } };
    apiInstance.mockRejectedValueOnce({ response: { status: 500 } });
    apiInstance.mockResolvedValueOnce(mockResponse);

    const promise = apiWithRetry({ url: '/test' }, 2, 10);
    await vi.advanceTimersByTimeAsync(10);
    const result = await promise;

    expect(result).toEqual(mockResponse);
    expect(apiInstance).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 400 error', async () => {
    const error = { response: { status: 400 } };
    apiInstance.mockRejectedValueOnce(error);

    await expect(apiWithRetry({ url: '/test' }, 2, 10)).rejects.toMatchObject({ response: { status: 400 } });
    expect(apiInstance).toHaveBeenCalledTimes(1);
  });

  it('throws after all retries exhausted', async () => {
    apiInstance.mockRejectedValue(new Error('Network Error'));

    const promise = apiWithRetry({ url: '/test' }, 1, 10);
    const assertion = expect(promise).rejects.toThrow('Network Error');
    await vi.advanceTimersByTimeAsync(30);
    await assertion;
    expect(apiInstance).toHaveBeenCalledTimes(2);
  });
});
