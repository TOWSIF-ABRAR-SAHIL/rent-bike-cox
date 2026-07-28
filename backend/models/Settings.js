const mongoose = require('mongoose');

const brandingSchema = new mongoose.Schema({
  logoUrl: { type: String, default: '' },
  logoDarkUrl: { type: String, default: '' },
  faviconUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#F97316' },
  secondaryColor: { type: String, default: '#8b5cf6' },
  accentColor: { type: String, default: '#f59e0b' },
  heroImageUrl: { type: String, default: '' },
  businessName: { type: String, default: "Rent Bike Cox's Bazar" },
  businessTagline: { type: String, default: "Your ride, your way, in Cox's Bazar" },
  businessAddress: { type: String, default: "Cox's Bazar, Bangladesh" },
  contactNumbers: [{ type: String }],
  contactEmail: { type: String, default: '' },
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    tiktok: { type: String, default: '' }
  },
  metaTags: {
    siteTitle: { type: String, default: "Rent Bike Cox's Bazar" },
    siteDescription: { type: String, default: "Bike, car, and jeep rental in Cox's Bazar, Bangladesh" },
    ogImage: { type: String, default: '' }
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
  branding: { type: brandingSchema, default: () => ({}) }
}, { timestamps: true });

settingsSchema.pre('save', function (next) {
  if (this.basePricePerHour !== undefined && (this.basePricePerHour < 100 || this.basePricePerHour > 100000)) {
    return next(new Error('basePricePerHour must be between 100 and 100000'));
  }
  if (this.adminCommissionPercent !== undefined && (this.adminCommissionPercent < 0 || this.adminCommissionPercent > 50)) {
    return next(new Error('adminCommissionPercent must be between 0 and 50'));
  }
  if (this.branding && this.branding.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(this.branding.primaryColor)) {
    return next(new Error('primaryColor must be a valid hex color'));
  }
  if (this.branding && this.branding.secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(this.branding.secondaryColor)) {
    return next(new Error('secondaryColor must be a valid hex color'));
  }
  if (this.branding && this.branding.accentColor && !/^#[0-9A-Fa-f]{6}$/.test(this.branding.accentColor)) {
    return next(new Error('accentColor must be a valid hex color'));
  }
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
