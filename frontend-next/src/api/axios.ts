"use client";

import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { AuthTokens } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
});

interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

export interface ApiError extends AxiosError {
  retryAfter?: number;
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      const original = error.config as RetryableRequestConfig | undefined;
      if (!refreshToken || original?.url?.includes('/auth/refresh')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (original && !original._retry) {
        original._retry = true;
        try {
          const res = await axios.post<AuthTokens>(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          original.headers = original.headers ?? {};
          (original.headers as Record<string, string>).Authorization =
            `Bearer ${res.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    const apiError = error as ApiError;
    if (error.response?.status === 423) {
      const data = error.response.data as { retryAfter?: number } | undefined;
      apiError.retryAfter = data?.retryAfter ?? 900;
    }
    if (error.response?.status === 429) {
      const header = error.response.headers?.['retry-after'];
      const parsed = parseInt(Array.isArray(header) ? header[0] : (header ?? ''), 10);
      apiError.retryAfter = Number.isNaN(parsed) ? 60 : parsed;
    }
    return Promise.reject(apiError);
  }
);

export async function apiWithRetry<T = unknown>(
  config: AxiosRequestConfig,
  retries = 2,
  delay = 500
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await api.request<T>(config);
    } catch (err) {
      const axiosErr = err as AxiosError;
      const isNetworkError = !axiosErr.response;
      const isServerError = (axiosErr.response?.status ?? 0) >= 500;
      const isLastAttempt = attempt === retries;
      if ((isNetworkError || isServerError) && !isLastAttempt) {
        await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('apiWithRetry exhausted retries without returning');
}

export default api;
