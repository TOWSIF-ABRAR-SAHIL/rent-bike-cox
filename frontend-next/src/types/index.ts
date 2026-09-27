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
  phoneNumber?: string;
  address?: string;
  role?: UserRole;
  avatar?: string;
  isVerified?: boolean;
  memberSince?: string;
  date?: string;
  bio?: string;
  emergencyContact?: { name?: string; phone?: string; relation?: string } | string;
  nidImage?: string;
  licenseImage?: string;
}

export interface ProfileFormState {
  name: string;
  phoneNumber: string;
  address: string;
  bio: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  nidImage: File | null;
  licenseImage: File | null;
  avatar: File | null;
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
  isActive?: boolean;
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
  rating?: number | { avgRating?: number; average?: number; total?: number; count?: number };
  reviewCount?: number;
  isAvailable?: boolean;
  availability?: boolean;
  isUnderMaintenance?: boolean;
  nextServiceDue?: string;
  condition?: string;
  totalKm?: number;
  currentMileage?: number;
  location?: string;
  videoUrl?: string;
  engine?: string;
  mileage?: string | number;
  zone?: string | { name?: string };
  packages?: { minHours?: number; label?: string; hourlyRate?: number }[];
  isVerified?: boolean;
  renter?: { _id?: string; name?: string } | string;
  activeBooking?: unknown;
  nextMaintenanceDue?: string;
  lastServiceDate?: string;
}

export interface Review {
  _id: string;
  rating?: number | { avgRating?: number; average?: number; total?: number; count?: number };
  title?: string;
  comment?: string;
  user?: { name?: string };
  createdAt?: string;
  response?: string;
  respondedBy?: { name?: string } | string;
}

export interface ReviewStats {
  avgRating?: number;
  total?: number;
  five?: number;
  four?: number;
  three?: number;
  two?: number;
  one?: number;
}

export interface CouponApplied {
  code?: string;
  discount?: number;
}

export interface Faq {
  _id?: string;
  tags?: string[];
  isPinned?: boolean;
  helpfulCount?: number;
  notHelpfulCount?: number;
  question?: string;
  answer?: string;
  category?: string;
}

export interface PreviewData {
  pricing?: PricingInfo;
  available?: boolean;
  conflictMessage?: string;
}

export interface NotificationItem {
  _id: string;
  read?: boolean;
  title?: string;
  message?: string;
  type?: string;
  createdAt?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DateRange {
  start?: string;
  end?: string;
}

export interface FleetFilters {
  search?: string;
  status?: string;
  condition?: string;
  sort?: string;
}

export interface HistoryFilters {
  type?: string;
  from?: string;
  to?: string;
}

export interface HistoryStatsData {
  totalBookings?: number;
  completedBookings?: number;
  cancelledBookings?: number;
  completionRate?: number | string;
  totalRevenue?: number;
  avgRevenuePerBooking?: number | string;
  totalMaintenanceEvents?: number;
  totalMaintenanceCost?: number;
}

export interface HistoryEventData {
  _id?: string;
  status?: string;
  maintenanceType?: string;
  user?: string;
  invoiceNumber?: string;
  startTime?: string;
  endTime?: string;
  totalPrice?: number;
  advancePaid?: number;
  refundAmount?: number;
  cancellationReason?: string;
  title?: string;
  description?: string;
  performedBy?: { name?: string } | string;
  previousStatus?: string;
  cost?: number;
  mileage?: number;
  nextServiceDue?: string;
}

export interface HistoryEventItem {
  type?: string;
  date?: string;
  data: HistoryEventData;
}

export interface FleetStats {
  total: number;
  active: number;
  unavailable: number;
  underMaintenance: number;
  needsService: number;
}

export interface MaintenanceFormState {
  type: string;
  title: string;
  description: string;
  cost: string;
  mileage: string;
  nextServiceDue: string;
  nextServiceMileage: string;
  notes: string;
}

export interface DocumentFormState {
  type: string;
  name: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  notes: string;
}

export interface VehicleDocument {
  _id?: string;
  fileUrl?: string;
  type?: string;
  name?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  notes?: string;
  verified?: boolean;
  url?: string;
}

export interface Suggestion {
  type?: string;
  id?: string;
  slug?: string;
  label?: string;
  sublabel?: string;
  image?: string;
}

export interface SearchFilterState {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  availability?: string;
  condition?: string;
  sort?: string;
  zone?: string;
  search?: string;
}

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface SeasonalRate {
  _id?: string;
  priority?: number;
  description?: string;
  isActive?: boolean;
  type?: string;
  daysOfWeek?: number[];
  recurringYearly?: boolean;
  month?: number;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
  multiplier?: number;
  name?: string;
}

export interface TopBikeItem {
  bike?: Bike;
  bookings?: number;
  revenue?: number;
  avgRevenue?: number;
}

export interface PricingInfo {
  hours?: number;
  hourlyRate?: number;
  packageName?: string;
  totalPrice?: number;
  minAdvance?: number;
  advancePercent?: number;
  couponApplied?: CouponApplied;
}

export interface TrendDay {
  date?: string;
  total?: number;
  completed?: number;
  cancelled?: number;
}

export interface StatusCount {
  status?: string;
  count?: number;
}

export interface BookingTrendData {
  statusBreakdown?: StatusCount[];
  bookingsByDay?: TrendDay[];
}

export interface CategoryPerf {
  category?: string;
  bikes?: number;
  bookings?: number;
  revenue?: number;
}

export interface TopSpender {
  name?: string;
  totalSpent?: number;
  bookings?: number;
}

export interface CustomerInsightsData {
  totalCustomers?: number | string;
  newCustomers?: number | string;
  activeCustomers?: number;
  repeatCustomers?: number;
  repeatRate?: number | string;
  avgSpendPerCustomer?: number;
  topSpenders?: TopSpender[];
}

export type ConditionMap = Record<string, number>;

export interface UtilizationBike {
  bikeId?: string;
  brand?: string;
  model?: string;
  utilization?: string | number;
}

export interface UtilizationData {
  fleetUtilization?: number | string;
  bikes?: UtilizationBike[];
  days?: number | string;
}

export interface HourCount {
  hour?: number;
  count?: number;
}

export interface HourlyData {
  hourlyDistribution?: HourCount[];
}

export interface DurationBucket {
  label?: string;
  count?: number;
  percentage?: number | string;
}

export interface DurationData {
  buckets?: DurationBucket[];
  avgHours?: number;
  medianHours?: number;
  totalBookings?: number;
}

export interface RevenueDay {
  date?: string;
  revenue?: number;
  count?: number;
}

export interface RevenueData {
  revenueGrowth?: number;
  totalBookings?: number;
  revenueByDay?: RevenueDay[];
  totalRevenue?: number;
  avgRevenuePerDay?: number;
}

export interface FinancialData {
  totalRevenue?: number;
  totalAdvanceCollected?: number;
  totalRemainingCollected?: number;
  netRevenue?: number;
  totalSecurityDeposits?: number;
  totalRefunds?: number;
  refundCount?: number;
  collectionRate?: number;
  refundRate?: number;
}

export interface FleetSummaryData {
  conditionMap?: ConditionMap;
  totalBikes?: number;
  activeBikes?: number;
  maintenanceBikes?: number;
  unavailableBikes?: number;
  bookingsThisMonth?: number;
  revenueThisMonth?: number;
  activeBookings?: number;
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
  createdAt?: string;
  securityDeposit?: number;
  advancePaid?: number;
  user?: { name?: string; phoneNumber?: string; nid?: string; license?: string };
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

export interface RenterTransaction {
  bookingId?: string;
  vehicle?: string;
  renterName?: string;
  duration?: number;
  totalAmount?: number;
  payoutStatus?: string;
}

export interface RevenuePoint {
  date?: string;
  revenue?: number;
}

export interface VehicleEarning {
  _id?: string;
  model?: string;
  brand?: string;
  bookings?: number;
  earnings?: number;
}

export interface RenterEarningsData {
  revenueSeries?: RevenuePoint[];
  recentTransactions?: RenterTransaction[];
  totalEarnings?: number;
  pendingPayout?: number;
  completedBookings?: number;
  byVehicle?: VehicleEarning[];
}

export interface AdminNotificationItem {
  _id: string;
  type?: string;
  severity?: string;
  isRead?: boolean;
  title?: string;
  message?: string;
  createdAt?: string;
}

export interface MaintenanceLog {
  _id: string;
  status?: string;
  type?: string;
  title?: string;
  description?: string;
  performedAt?: string;
  cost?: number;
  mileage?: number;
  performedBy?: { name?: string } | string;
  notes?: string;
}

export interface Dispute {
  _id: string;
  status?: string;
  reason?: string;
  description?: string;
  bike?: Bike;
  booking?: { _id?: string } | string;
  createdAt?: string;
  resolution?: string;
  resolvedBy?: { name?: string } | string;
  resolvedAt?: string;
}

export interface NotificationPrefs {
  email: Record<string, boolean>;
  push: Record<string, boolean>;
  inApp: Record<string, boolean>;
}

export interface BikePackage {
  label?: string;
  minHours?: number;
  maxHours?: number | null;
  hourlyRate?: number;
}

export interface Coupon {
  _id: string;
  usedCount?: number;
  code?: string;
  discountPercent?: number;
  maxUses?: number;
  expiresAt?: string;
  isActive?: boolean;
}

export interface AdminFinance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin overview payload is schemaless
  overview: { [key: string]: any } | null;
  fraudEvents: { events?: FraudEvent[] } | null;
}

export interface AdminSettings {
  basePricePerHour: number;
  packages: BikePackage[];
  businessRules?: {
    fines?: { name?: string; amount?: number }[];
    booking?: { minHours?: number; maxHours?: number; bufferMinutes?: number; minStartMinutes?: number };
    payment?: { advancePercentShort?: number; advancePercentLong?: number };
    cancellation?: { fullRefundHours?: number; partialRefundPercent?: number; noRefundHours?: number };
  };
}

export interface ScheduledBike extends Bike {
  daysUntil: number;
  isOverdue: boolean;
}

export interface FraudEvent {
  _id?: string;
  createdAt?: string;
  eventType?: string;
  ip?: string;
  severity?: string;
  actionTaken?: string;
}

export interface NewBikeForm {
  model: string;
  brand: string;
  category: string;
  description: string;
  pricePerHour: number;
  videoUrl: string;
}

export interface NewBikePayload {
  newBike: NewBikeForm;
  bikePackages: BikePackage[];
  bikeFiles: File[];
}

export interface MaintenanceOverviewLog {
  _id?: string;
  vehicle?: string;
  serviceDate?: string;
  issueDescription?: string;
  cost?: number;
  status?: string;
}

export interface MaintenanceOverview {
  stats?: { scheduled?: number; inProgress?: number; completed?: number };
  logs?: MaintenanceOverviewLog[];
}

export interface RefundUser {
  name?: string;
  email?: string;
}

export interface RefundItem {
  _id: string;
  status?: string;
  amountPaisa?: number;
  refundId?: string;
  userId?: RefundUser | string;
  bookingId?: { invoiceNumber?: string } | string;
  createdAt?: string;
}

export interface SeasonalRateForm {
  name: string;
  type: string;
  multiplier: number;
  startDate: string;
  endDate: string;
  recurringYearly: boolean;
  month: string | number;
  dayOfMonth: string | number;
  daysOfWeek: number[];
  isActive: boolean;
  priority: number;
  description: string;
}

export interface Branding {
  businessName: string;
  businessTagline: string;
  businessAddress: string;
  contactNumbers: string[];
  contactEmail: string;
  whatsappNumber: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  logoUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  heroImageUrl: string;
  socialLinks: { facebook: string; instagram: string; youtube: string; whatsapp: string; tiktok: string; twitter: string };
  metaTags: { siteTitle: string; siteDescription: string; ogImage: string };
  legal: { companyName: string; tradeLicense: string; taxId: string };
}

export interface CacheKeyEntry {
  key: string;
  ttl?: number;
  size?: number;
  valueType?: string;
}

export interface CacheData {
  keys?: CacheKeyEntry[];
  stats: { [key: string]: number | string };
}

export interface HealthData {
  server?: { status?: string; uptime?: number };
  database?: { status?: string };
  memory?: { heapUsed?: number; heapTotal?: number; rss?: number } | null;
}

export interface LogEntry {
  line?: number;
  content?: string | { level?: string; severity?: string; message?: string; timestamp?: string; [key: string]: unknown };
}

export interface RateLimitInfo {
  name: string;
  max: number;
  windowMinutes?: number;
  windowMs?: number;
}

export interface RateLimitInfo {
  name: string;
  max: number;
  windowMinutes?: number;
  windowMs?: number;
}

export interface ReportTypeInfo {
  id: string;
  label: string;
  description: string;
  group: string;
}

export interface ReportHistoryItem {
  _id?: string;
  reportType?: string;
  format?: string;
  fileSize?: string;
  rowCount?: number;
  dateRange?: string;
  createdAt?: string;
}

export interface TemplateChannel {
  subject?: string;
  title?: string;
  body?: string;
  message?: string;
  isActive?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface NotificationTemplate {
  key?: string;
  variables?: { name?: string; description?: string; example?: string }[];
  name?: string;
  category?: string;
  isActive?: boolean;
  channels?: Record<string, TemplateChannel>;
}

export interface ContentItem {
  key: string;
  value: string;
  label?: string;
  validation?: { required?: boolean; minLength?: number; maxLength?: number; regex?: string };
  placeholder?: string;
  type?: string;
  section?: string;
  page?: string;
  updatedAt?: string;
}

export interface AnnouncementStyle {
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  icon?: string;
}

export interface AnnouncementSchedule {
  startDate?: string;
  endDate?: string;
  showOnce?: boolean;
  frequency?: string;
}

export interface AnnouncementActions {
  ctaText?: string;
  ctaUrl?: string;
  ctaNewTab?: boolean;
}

export interface AnnouncementItem {
  _id: string;
  title?: string;
  message?: string;
  type?: string;
  position?: string;
  pages?: string[];
  audience?: string;
  isActive?: boolean;
  isDismissible?: boolean;
  priority?: number;
  style?: AnnouncementStyle;
  schedule?: AnnouncementSchedule & { startDate?: string; endDate?: string | null };
  actions?: AnnouncementActions;
  analytics?: { views?: number; clicks?: number; dismissals?: number; impressions?: number };
}

export interface AnnouncementForm {
  title: string;
  message: string;
  type: string;
  position: string;
  pages: string[];
  audience: string;
  isActive: boolean;
  isDismissible: boolean;
  priority: number;
  style: Required<AnnouncementStyle>;
  schedule: { startDate: string; endDate: string; showOnce: boolean; frequency: string };
  actions: { ctaText: string; ctaUrl: string; ctaNewTab: boolean };
}

export interface CampaignForm {
  name: string;
  subject: string;
  body: string;
  audience: string;
  scheduledAt: string;
  timezone: string;
  batchSize: number;
  batchDelay: number;
}

export interface CampaignAnalytics {
  name?: string;
  openCount?: number;
  clickCount?: number;
  progress?: number;
  sentCount?: number;
  failedCount?: number;
  total?: number;
}

export interface Campaign {
  _id: string;
  name?: string;
  subject?: string;
  body?: string;
  audience?: { filter?: string };
  status?: string;
  scheduledAt?: string;
  sentAt?: string;
  timezone?: string;
  batchSize?: number;
  batchDelay?: number;
  scheduling?: { timezone?: string; sendAt?: string };
  progress?: { total?: number; sent?: number; failed?: number; bounced?: number; opened?: number; clicked?: number } | number;
  sentCount?: number;
  failedCount?: number;
}

export interface ConversationEntry {
  sender?: string;
  text?: string;
  createdAt?: string;
  sentAt?: string;
  message?: string;
  reply?: string;
}

export interface MessageStats {
  total?: number;
  escalated?: number;
  open?: number;
  closed?: number;
  avgResponseTimeHours?: number;
  byCategory?: { _id?: string; count?: number }[];
  byPriority?: { _id?: string; count?: number }[];
}

export interface ContactMessage {
  _id: string;
  phone?: string;
  conversation?: ConversationEntry[];
  status?: string;
  priority?: string;
  category?: string;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  ticketId?: string;
  createdAt?: string;
  assignedTo?: string;
}

export interface SystemHealth {
  server?: { status?: string; uptime?: number; environment?: string; nodeVersion?: string };
  memory?: { heapUsed?: number; heapTotal?: number; rss?: number } | null;
  database?: { status?: string; responseTime?: number; collections?: number; totalDocuments?: number };
  cpu?: { usage?: number; model?: string; cores?: number };
}
