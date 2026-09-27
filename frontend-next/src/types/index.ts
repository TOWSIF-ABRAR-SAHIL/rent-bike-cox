/** Shared domain types for the Next.js port. Kept pragmatic — P3 tightens these. */

export type UserRole = 'Admin' | 'Renter' | 'User';

export interface JwtPayload {
  id: string;
  role: UserRole;
  exp: number;
  iat?: number;
}

export interface StoredUser {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  avatar?: string;
  isVerified?: boolean;
  memberSince?: string;
  bio?: string;
  emergencyContact?: string;
}

/** Decoded JWT merged with the cached profile object (see AuthContext). */
export type AuthUser = JwtPayload & Partial<StoredUser>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface BikeCategory {
  _id?: string;
  name?: string;
  slug?: string;
}

export interface Bike {
  _id: string;
  model?: string;
  brand?: string;
  description?: string;
  images?: string[];
  capacity?: number;
  category?: BikeCategory | string;
  pricePerHour?: number;
  rating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
  condition?: string;
  totalKm?: number;
  location?: string;
}

export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Active'
  | 'Completed'
  | 'Cancelled';

export interface Booking {
  _id: string;
  status?: BookingStatus;
  pickupLocation?: string;
  invoiceNumber?: string;
  totalAmount?: number;
}

export interface SiteContentItem {
  key: string;
  value: string;
}

export type SiteContentMap = Record<string, string>;

export type ToastType = 'success' | 'error' | 'info';

export interface ApiResponse<T> {
  data: T;
}
