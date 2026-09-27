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
  videoUrl?: string;
  zone?: string | { name?: string };
  packages?: { minHours?: number }[];
  currentMileage?: number;
  isVerified?: boolean;
}

export interface Review {
  _id: string;
  rating?: number;
  title?: string;
  comment?: string;
  user?: { name?: string };
  createdAt?: string;
}

export interface ReviewStats {
  avgRating?: number;
  total?: number;
}

export interface CouponApplied {
  code?: string;
  discount?: number;
}

export interface Faq {
  _id?: string;
  question?: string;
  answer?: string;
  category?: string;
}

export interface PricingInfo {
  hourlyRate?: number;
  totalPrice?: number;
  minAdvance?: number;
  advancePercent?: number;
  couponApplied?: CouponApplied;
}

export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Active'
  | 'Completed'
  | 'Cancelled'
  | 'Expired';

export interface Booking {
  _id: string;
  status?: string;
  pickupLocation?: string;
  destination?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  totalPrice?: number;
  startTime?: string;
  endTime?: string;
  packageName?: string;
  bike?: Bike & { images?: string[] };
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
