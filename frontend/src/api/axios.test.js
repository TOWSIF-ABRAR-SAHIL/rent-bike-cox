import { describe, it, expect, vi } from 'vitest';

function createMockApi() {
  const fn = vi.fn();
  const retryFn = async (config, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(config);
      } catch (err) {
        const isNetworkError = !err.response;
        const isServerError = err.response?.status >= 500;
        const isLastAttempt = attempt === retries;
        if ((isNetworkError || isServerError) && !isLastAttempt) {
          await new Promise((r) => setTimeout(r, 10));
          continue;
        }
        throw err;
      }
    }
  };
  return { fn, retryFn };
}

describe('apiWithRetry', () => {
  it('returns response on success', async () => {
    const { fn, retryFn } = createMockApi();
    const mockResponse = { data: { ok: true } };
    fn.mockResolvedValueOnce(mockResponse);
    const result = await retryFn({ url: '/test' });
    expect(result).toEqual(mockResponse);
  });

  it('retries on network error', async () => {
    const { fn, retryFn } = createMockApi();
    const mockResponse = { data: { ok: true } };
    fn.mockRejectedValueOnce(new Error('Network Error'));
    fn.mockResolvedValueOnce(mockResponse);
    const result = await retryFn({ url: '/test' }, 2);
    expect(result).toEqual(mockResponse);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 error', async () => {
    const { fn, retryFn } = createMockApi();
    const mockResponse = { data: { ok: true } };
    fn.mockRejectedValueOnce({ response: { status: 500 }, message: 'Server Error' });
    fn.mockResolvedValueOnce(mockResponse);
    const result = await retryFn({ url: '/test' }, 2);
    expect(result).toEqual(mockResponse);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 400 error', async () => {
    const { fn, retryFn } = createMockApi();
    fn.mockRejectedValueOnce({ response: { status: 400 }, message: 'Bad Request' });
    await expect(retryFn({ url: '/test' }, 2)).rejects.toMatchObject({ response: { status: 400 } });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after all retries exhausted', async () => {
    const { fn, retryFn } = createMockApi();
    fn.mockRejectedValue(new Error('Network Error'));
    await expect(retryFn({ url: '/test' }, 1)).rejects.toThrow('Network Error');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
