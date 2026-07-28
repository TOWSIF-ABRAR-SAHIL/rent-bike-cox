const mongoose = require('mongoose');

const validationSchema = new mongoose.Schema({
  required: { type: Boolean, default: false },
  minLength: { type: Number },
  maxLength: { type: Number },
  regex: { type: String }
}, { _id: false });

const brandingSchema = new mongoose.Schema({
  logoUrl: { type: String, default: '' },
  logoDarkUrl: { type: String, default: '' },
  faviconUrl: { type: String, default: '' },
  ogImageUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#F97316' },
  secondaryColor: { type: String, default: '#8b5cf6' },
  accentColor: { type: String, default: '#f59e0b' },
  successColor: { type: String, default: '#22C55E' },
  warningColor: { type: String, default: '#EAB308' },
  dangerColor: { type: String, default: '#EF4444' },
  heroImageUrl: { type: String, default: '' },
  businessName: { type: String, default: "Rent Bike Cox's Bazar" },
  businessTagline: { type: String, default: "Your ride, your way, in Cox's Bazar" },
  businessAddress: { type: String, default: "Cox's Bazar, Bangladesh" },
  contactNumbers: [{ type: String }],
  contactEmail: { type: String, default: '' },
  whatsappNumber: { type: String, default: '' },
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    twitter: { type: String, default: '' }
  },
  metaTags: {
    siteTitle: { type: String, default: "Rent Bike Cox's Bazar" },
    siteDescription: { type: String, default: "Bike, car, and jeep rental in Cox's Bazar, Bangladesh" },
    ogImage: { type: String, default: '' }
  },
  legal: {
    companyName: { type: String, default: '' },
    tradeLicense: { type: String, default: '' },
    taxId: { type: String, default: '' }
  }
}, { _id: false });

const fineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const businessRulesSchema = new mongoose.Schema({
  booking: {
    minHours: { type: Number, default: 1 },
    maxHours: { type: Number, default: 720 },
    bufferMinutes: { type: Number, default: 30 },
    minStartTimeMinutes: { type: Number, default: 10 },
    checkoutTimeoutMinutes: { type: Number, default: 5 },
    maxActiveBookingsPerUser: { type: Number, default: 3 },
    requireVerification: { type: Boolean, default: true },
    allowGuestCheckout: { type: Boolean, default: false }
  },
  payment: {
    advancePercentShortTerm: { type: Number, default: 50 },
    advancePercentLongTerm: { type: Number, default: 30 },
    shortTermThresholdHours: { type: Number, default: 24 },
    securityDeposit: { type: Number, default: 2000 },
    minPricePerHour: { type: Number, default: 150 },
    maxPricePerHour: { type: Number, default: 5000 },
    allowPartialPayment: { type: Boolean, default: false },
    currency: { type: String, default: 'BDT' },
    currencySymbol: { type: String, default: '৳' }
  },
  cancellation: {
    fullRefundHours: { type: Number, default: 24 },
    partialRefundHours: { type: Number, default: 12 },
    partialRefundPercent: { type: Number, default: 50 },
    noShowPenaltyPercent: { type: Number, default: 100 },
    allowCancellationAfterStart: { type: Boolean, default: false },
    cancellationCooldownHours: { type: Number, default: 1 }
  },
  fines: { type: [fineSchema], default: [] },
  lateReturn: {
    graceMinutes: { type: Number, default: 15 },
    penaltyMultiplier: { type: Number, default: 1.5 },
    maxPenaltyDays: { type: Number, default: 3 },
    markAsTheftAfterDays: { type: Number, default: 3 }
  },
  verification: {
    requireNID: { type: Boolean, default: true },
    requireLicense: { type: Boolean, default: true },
    autoApprove: { type: Boolean, default: false },
    verificationExpiryDays: { type: Number, default: 365 }
  },
  registration: {
    allowedRoles: { type: [String], default: ['User', 'Renter'] },
    requirePhone: { type: Boolean, default: true },
    requireAddress: { type: Boolean, default: true },
    maxNIDImageSizeMB: { type: Number, default: 5 },
    maxLicenseImageSizeMB: { type: Number, default: 5 },
    allowedImageTypes: { type: [String], default: ['jpg', 'jpeg', 'png'] }
  },
  vehicles: {
    maxImagesPerBike: { type: Number, default: 10 },
    minImagesPerBike: { type: Number, default: 1 },
    maxCategories: { type: Number, default: 20 },
    requireDescription: { type: Boolean, default: false },
    requireRegistrationNumber: { type: Boolean, default: false },
    autoVerify: { type: Boolean, default: false }
  }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  basePricePerHour: { type: Number, required: true, default: 200 },
  packages: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true }
    }
  ],
  adminCommissionPercent: { type: Number, default: 10 },
  payoutSchedule: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'weekly' },
  supportedCurrencies: [{ type: String, default: 'BDT' }],
  gatewayPreference: [{ type: String, default: 'sslcommerz' }],
  branding: { type: brandingSchema, default: () => ({}) },
  businessRules: { type: businessRulesSchema, default: () => ({}) }
}, { timestamps: true });

function isValidHex(c) {
  return /^#[0-9A-Fa-f]{6}$/.test(c);
}

settingsSchema.pre('save', function () {
  if (this.basePricePerHour !== undefined && (this.basePricePerHour < 100 || this.basePricePerHour > 100000)) {
    throw new Error('basePricePerHour must be between 100 and 100000');
  }
  if (this.adminCommissionPercent !== undefined && (this.adminCommissionPercent < 0 || this.adminCommissionPercent > 50)) {
    throw new Error('adminCommissionPercent must be between 0 and 50');
  }
  const b = this.branding;
  if (b) {
    if (b.primaryColor && !isValidHex(b.primaryColor)) throw new Error('primaryColor must be a valid hex color');
    if (b.secondaryColor && !isValidHex(b.secondaryColor)) throw new Error('secondaryColor must be a valid hex color');
    if (b.accentColor && !isValidHex(b.accentColor)) throw new Error('accentColor must be a valid hex color');
    if (b.successColor && !isValidHex(b.successColor)) throw new Error('successColor must be a valid hex color');
    if (b.warningColor && !isValidHex(b.warningColor)) throw new Error('warningColor must be a valid hex color');
    if (b.dangerColor && !isValidHex(b.dangerColor)) throw new Error('dangerColor must be a valid hex color');
  }
});

module.exports = mongoose.model('Settings', settingsSchema);
