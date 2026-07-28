const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike';

const contentItems = [
  // ── HOME / HERO ──
  { key: 'home.hero.pillText', value: "Cox's Bazar, Bangladesh", type: 'text', page: 'home', section: 'hero', label: 'Hero Badge Text', description: 'Small pill badge above hero title', placeholder: 'e.g. Cox\'s Bazar, Bangladesh', group: 'Home Page', sortOrder: 1, defaultValue: "Cox's Bazar, Bangladesh" },
  { key: 'home.hero.title', value: "Explore Cox's Bazar on Two Wheels", type: 'text', page: 'home', section: 'hero', label: 'Hero Title', description: 'Main hero heading', placeholder: 'e.g. Explore Cox\'s Bazar on Two Wheels', group: 'Home Page', sortOrder: 2, defaultValue: "Explore Cox's Bazar on Two Wheels" },
  { key: 'home.hero.titleHighlight', value: 'Two Wheels', type: 'text', page: 'home', section: 'hero', label: 'Hero Title Highlight', description: 'Highlighted part of hero title', placeholder: 'e.g. Two Wheels', group: 'Home Page', sortOrder: 3, defaultValue: 'Two Wheels' },
  { key: 'home.hero.subtitle', value: "Rent bikes, cars & beach jeeps at the world's longest beach. Best prices, verified vehicles, secure online payment.", type: 'text', page: 'home', section: 'hero', label: 'Hero Subtitle', description: 'Hero subtitle text', placeholder: 'Describe your service briefly', group: 'Home Page', sortOrder: 4, defaultValue: "Rent bikes, cars & beach jeeps at the world's longest beach. Best prices, verified vehicles, secure online payment." },
  { key: 'home.hero.ctaText', value: 'Browse Vehicles', type: 'text', page: 'home', section: 'hero', label: 'Hero CTA Button', description: 'Hero call-to-action button text', placeholder: 'e.g. Browse Vehicles', group: 'Home Page', sortOrder: 5, defaultValue: 'Browse Vehicles' },
  { key: 'home.hero.ctaLink', value: '/search', type: 'url', page: 'home', section: 'hero', label: 'Hero CTA Link', description: 'Hero CTA button destination', placeholder: 'e.g. /search', group: 'Home Page', sortOrder: 6, defaultValue: '/search' },
  { key: 'home.hero.backgroundImage', value: '', type: 'image', page: 'home', section: 'hero', label: 'Hero Background Image', description: 'Cloudinary URL for hero background', placeholder: 'Cloudinary image URL', group: 'Home Page', sortOrder: 7, defaultValue: '' },

  // ── HOME / STATS ──
  { key: 'home.stats.totalCustomers', value: 500, type: 'number', page: 'home', section: 'stats', label: 'Total Customers', description: 'Customer count for stats display', group: 'Home Page', sortOrder: 8, defaultValue: 500 },
  { key: 'home.stats.totalVehicles', value: 50, type: 'number', page: 'home', section: 'stats', label: 'Total Vehicles', description: 'Vehicle count for stats display', group: 'Home Page', sortOrder: 9, defaultValue: 50 },
  { key: 'home.stats.totalZones', value: 8, type: 'number', page: 'home', section: 'stats', label: 'Total Zones', description: 'Service zone count', group: 'Home Page', sortOrder: 10, defaultValue: 8 },
  { key: 'home.stats.satisfaction', value: 98, type: 'number', page: 'home', section: 'stats', label: 'Satisfaction Rate', description: 'Customer satisfaction percentage', group: 'Home Page', sortOrder: 11, defaultValue: 98 },
  { key: 'home.stats.label1', value: 'Happy Customers', type: 'text', page: 'home', section: 'stats', label: 'Stat Label 1', description: 'Label for total customers stat', group: 'Home Page', sortOrder: 12, defaultValue: 'Happy Customers' },
  { key: 'home.stats.label2', value: 'Vehicles Available', type: 'text', page: 'home', section: 'stats', label: 'Stat Label 2', description: 'Label for total vehicles stat', group: 'Home Page', sortOrder: 13, defaultValue: 'Vehicles Available' },
  { key: 'home.stats.label3', value: 'Service Zones', type: 'text', page: 'home', section: 'stats', label: 'Stat Label 3', description: 'Label for zones stat', group: 'Home Page', sortOrder: 14, defaultValue: 'Service Zones' },
  { key: 'home.stats.label4', value: 'Satisfaction Rate', type: 'text', page: 'home', section: 'stats', label: 'Stat Label 4', description: 'Label for satisfaction stat', group: 'Home Page', sortOrder: 15, defaultValue: 'Satisfaction Rate' },

  // ── HOME / FEATURES ──
  { key: 'home.features.title', value: 'Why Choose Us', type: 'text', page: 'home', section: 'features', label: 'Features Title', description: 'Features section heading', group: 'Home Page', sortOrder: 16, defaultValue: 'Why Choose Us' },
  { key: 'home.features.subtitle', value: "The best vehicle rental experience in Cox's Bazar", type: 'text', page: 'home', section: 'features', label: 'Features Subtitle', description: 'Features section subtitle', group: 'Home Page', sortOrder: 17, defaultValue: "The best vehicle rental experience in Cox's Bazar" },
  { key: 'home.features.items', value: [{"title":"Verified Vehicles","desc":"Every vehicle inspected and verified","icon":"Shield"},{"title":"Secure Payment","desc":"Pay via SSLCommerz — bKash, Nagad, Card","icon":"CreditCard"},{"title":"24/7 Support","desc":"Reach us anytime via call or WhatsApp","icon":"Headphones"},{"title":"Instant Booking","desc":"Book in seconds with instant confirmation","icon":"Zap"}], type: 'json', page: 'home', section: 'features', label: 'Feature Cards', description: 'Feature cards array of {title, desc, icon}', group: 'Home Page', sortOrder: 18, defaultValue: [{"title":"Verified Vehicles","desc":"Every vehicle inspected and verified","icon":"Shield"},{"title":"Secure Payment","desc":"Pay via SSLCommerz — bKash, Nagad, Card","icon":"CreditCard"},{"title":"24/7 Support","desc":"Reach us anytime via call or WhatsApp","icon":"Headphones"},{"title":"Instant Booking","desc":"Book in seconds with instant confirmation","icon":"Zap"}] },

  // ── HOME / HOW IT WORKS ──
  { key: 'home.steps.title', value: 'How It Works', type: 'text', page: 'home', section: 'steps', label: 'Steps Title', description: 'Steps section heading', group: 'Home Page', sortOrder: 19, defaultValue: 'How It Works' },
  { key: 'home.steps.subtitle', value: 'Three simple steps to your ride', type: 'text', page: 'home', section: 'steps', label: 'Steps Subtitle', description: 'Steps section subtitle', group: 'Home Page', sortOrder: 20, defaultValue: 'Three simple steps to your ride' },
  { key: 'home.steps.items', value: [{"num":"01","title":"Browse","desc":"Find the perfect bike, car or jeep"},{"num":"02","title":"Book","desc":"Select dates, pay advance securely"},{"num":"03","title":"Ride","desc":"Pick up and explore Cox's Bazar"}], type: 'json', page: 'home', section: 'steps', label: 'How It Works Steps', description: 'Steps array of {num, title, desc}', group: 'Home Page', sortOrder: 21, defaultValue: [{"num":"01","title":"Browse","desc":"Find the perfect bike, car or jeep"},{"num":"02","title":"Book","desc":"Select dates, pay advance securely"},{"num":"03","title":"Ride","desc":"Pick up and explore Cox's Bazar"}] },

  // ── HOME / TESTIMONIALS ──
  { key: 'home.testimonials.title', value: 'What Riders Say', type: 'text', page: 'home', section: 'testimonials', label: 'Testimonials Title', description: 'Testimonials section heading', group: 'Home Page', sortOrder: 22, defaultValue: 'What Riders Say' },
  { key: 'home.testimonials.subtitle', value: "Real experiences from our customers in Cox's Bazar", type: 'text', page: 'home', section: 'testimonials', label: 'Testimonials Subtitle', description: 'Testimonials section subtitle', group: 'Home Page', sortOrder: 23, defaultValue: "Real experiences from our customers in Cox's Bazar" },
  { key: 'home.testimonials.items', value: [{"name":"Rahim Uddin","role":"Tourist","text":"Rented a bike for 3 days. Easy process, great condition!","rating":5,"vehicle":"TVS Scooty"},{"name":"Fatima Ahmed","role":"Local Resident","text":"Best rental service. Affordable prices, seamless payment.","rating":5,"vehicle":"Honda CB Shine"},{"name":"Kamal Hossain","role":"Adventurer","text":"Took a jeep to Himchari. Amazing experience.","rating":4,"vehicle":"Mahindra Thar"}], type: 'json', page: 'home', section: 'testimonials', label: 'Testimonials', description: 'Testimonials array of {name, role, text, rating, vehicle}', group: 'Home Page', sortOrder: 24, defaultValue: [{"name":"Rahim Uddin","role":"Tourist","text":"Rented a bike for 3 days. Easy process, great condition!","rating":5,"vehicle":"TVS Scooty"},{"name":"Fatima Ahmed","role":"Local Resident","text":"Best rental service. Affordable prices, seamless payment.","rating":5,"vehicle":"Honda CB Shine"},{"name":"Kamal Hossain","role":"Adventurer","text":"Took a jeep to Himchari. Amazing experience.","rating":4,"vehicle":"Mahindra Thar"}] },

  // ── HOME / EXPLORE ZONES ──
  { key: 'home.zones.title', value: 'Explore Zones', type: 'text', page: 'home', section: 'zones', label: 'Zones Title', description: 'Zones section heading', group: 'Home Page', sortOrder: 25, defaultValue: 'Explore Zones' },
  { key: 'home.zones.subtitle', value: "Discover rental zones across Cox's Bazar", type: 'text', page: 'home', section: 'zones', label: 'Zones Subtitle', description: 'Zones section subtitle', group: 'Home Page', sortOrder: 26, defaultValue: "Discover rental zones across Cox's Bazar" },

  // ── HOME / CTA ──
  { key: 'home.cta.title', value: 'Ready to Ride?', type: 'text', page: 'home', section: 'cta', label: 'CTA Title', description: 'Bottom call-to-action title', group: 'Home Page', sortOrder: 27, defaultValue: 'Ready to Ride?' },
  { key: 'home.cta.subtitle', value: 'Book your vehicle now and start exploring', type: 'text', page: 'home', section: 'cta', label: 'CTA Subtitle', description: 'Bottom call-to-action subtitle', group: 'Home Page', sortOrder: 28, defaultValue: 'Book your vehicle now and start exploring' },
  { key: 'home.cta.buttonText', value: 'Start Booking', type: 'text', page: 'home', section: 'cta', label: 'CTA Button', description: 'Bottom CTA button text', group: 'Home Page', sortOrder: 29, defaultValue: 'Start Booking' },

  // ── NAVIGATION ──
  { key: 'nav.brand', value: "Rent Bike Cox's Bazar", type: 'text', page: 'global', section: 'nav', label: 'Navbar Brand', description: 'Brand name in navigation bar', group: 'Navigation', sortOrder: 1, defaultValue: "Rent Bike Cox's Bazar" },
  { key: 'nav.home', value: 'Home', type: 'text', page: 'global', section: 'nav', label: 'Nav Link: Home', group: 'Navigation', sortOrder: 2, defaultValue: 'Home' },
  { key: 'nav.search', value: 'Browse', type: 'text', page: 'global', section: 'nav', label: 'Nav Link: Browse', group: 'Navigation', sortOrder: 3, defaultValue: 'Browse' },
  { key: 'nav.policies', value: 'Policies', type: 'text', page: 'global', section: 'nav', label: 'Nav Link: Policies', group: 'Navigation', sortOrder: 4, defaultValue: 'Policies' },
  { key: 'nav.login', value: 'Login', type: 'text', page: 'global', section: 'nav', label: 'Nav Link: Login', group: 'Navigation', sortOrder: 5, defaultValue: 'Login' },
  { key: 'nav.signup', value: 'Sign Up', type: 'text', page: 'global', section: 'nav', label: 'Nav Link: Sign Up', group: 'Navigation', sortOrder: 6, defaultValue: 'Sign Up' },
  { key: 'nav.dashboard', value: 'Dashboard', type: 'text', page: 'global', section: 'nav', label: 'Nav Link: Dashboard', group: 'Navigation', sortOrder: 7, defaultValue: 'Dashboard' },
  { key: 'nav.myBookings', value: 'My Bookings', type: 'text', page: 'global', section: 'nav', label: 'Nav Link: My Bookings', group: 'Navigation', sortOrder: 8, defaultValue: 'My Bookings' },

  // ── FOOTER ──
  { key: 'footer.aboutText', value: "Your trusted vehicle rental platform in Cox's Bazar. Bikes, cars & beach jeeps at the best prices with secure online payment.", type: 'text', page: 'footer', section: 'about', label: 'Footer About', description: 'Footer about paragraph', group: 'Footer', sortOrder: 1, defaultValue: "Your trusted vehicle rental platform in Cox's Bazar." },
  { key: 'footer.copyrightText', value: '© 2026 Rent Bike Cox\'s Bazar. All rights reserved.', type: 'text', page: 'footer', section: 'copyright', label: 'Copyright Text', description: 'Copyright line in footer', group: 'Footer', sortOrder: 2, defaultValue: '© 2026 Rent Bike Cox\'s Bazar.' },
  { key: 'footer.builtWith', value: 'Built with React, Express & MongoDB', type: 'text', page: 'footer', section: 'copyright', label: 'Built With', description: 'Tech credit in footer', group: 'Footer', sortOrder: 3, defaultValue: 'Built with React, Express & MongoDB' },
  { key: 'footer.contactNumbers', value: '01891-154443, 01764-466757', type: 'text', page: 'footer', section: 'contact', label: 'Contact Numbers', description: 'Phone numbers in footer', group: 'Footer', sortOrder: 4, defaultValue: '01891-154443, 01764-466757' },
  { key: 'footer.address', value: "Cox's Bazar, Bangladesh", type: 'text', page: 'footer', section: 'contact', label: 'Address', description: 'Business address in footer', group: 'Footer', sortOrder: 5, defaultValue: "Cox's Bazar, Bangladesh" },
  { key: 'footer.quickLinks.title', value: 'Quick Links', type: 'text', page: 'footer', section: 'links', label: 'Quick Links Title', group: 'Footer', sortOrder: 6, defaultValue: 'Quick Links' },
  { key: 'footer.contact.title', value: 'Contact Us', type: 'text', page: 'footer', section: 'links', label: 'Contact Title', group: 'Footer', sortOrder: 7, defaultValue: 'Contact Us' },

  // ── LOGIN ──
  { key: 'login.title', value: 'Welcome Back', type: 'text', page: 'login', label: 'Login Title', description: 'Login page heading', group: 'Auth Pages', sortOrder: 1, defaultValue: 'Welcome Back' },
  { key: 'login.subtitle', value: 'Login to your account', type: 'text', page: 'login', label: 'Login Subtitle', description: 'Login page subtitle', group: 'Auth Pages', sortOrder: 2, defaultValue: 'Login to your account' },
  { key: 'login.emailLabel', value: 'Email Address', type: 'text', page: 'login', label: 'Email Label', group: 'Auth Pages', sortOrder: 3, defaultValue: 'Email Address' },
  { key: 'login.passwordLabel', value: 'Password', type: 'text', page: 'login', label: 'Password Label', group: 'Auth Pages', sortOrder: 4, defaultValue: 'Password' },
  { key: 'login.forgotLink', value: 'Forgot Password?', type: 'text', page: 'login', label: 'Forgot Password Link', group: 'Auth Pages', sortOrder: 5, defaultValue: 'Forgot Password?' },
  { key: 'login.submitButton', value: 'Login', type: 'text', page: 'login', label: 'Submit Button', group: 'Auth Pages', sortOrder: 6, defaultValue: 'Login' },
  { key: 'login.signupLink', value: "Don't have an account?", type: 'text', page: 'login', label: 'Signup Link', group: 'Auth Pages', sortOrder: 7, defaultValue: "Don't have an account?" },

  // ── SIGNUP ──
  { key: 'signup.title', value: 'Create Account', type: 'text', page: 'signup', label: 'Signup Title', group: 'Auth Pages', sortOrder: 8, defaultValue: 'Create Account' },
  { key: 'signup.subtitle', value: 'Join our rental platform', type: 'text', page: 'signup', label: 'Signup Subtitle', group: 'Auth Pages', sortOrder: 9, defaultValue: 'Join our rental platform' },
  { key: 'signup.termsText', value: 'By creating an account, you agree to our Terms of Service. Valid NID and Driving License are required.', type: 'text', page: 'signup', label: 'Terms Text', group: 'Auth Pages', sortOrder: 10, defaultValue: 'By creating an account, you agree to our Terms of Service.' },

  // ── CHECKOUT ──
  { key: 'checkout.title', value: 'Checkout', type: 'text', page: 'checkout', label: 'Page Title', group: 'Checkout & Invoice', sortOrder: 1, defaultValue: 'Checkout' },
  { key: 'checkout.termsTitle', value: 'Terms & Conditions', type: 'text', page: 'checkout', label: 'Terms Title', group: 'Checkout & Invoice', sortOrder: 2, defaultValue: 'Terms & Conditions' },
  { key: 'checkout.termsText', value: 'I have read and agree to all terms and conditions.', type: 'text', page: 'checkout', label: 'Terms Checkbox Label', group: 'Checkout & Invoice', sortOrder: 3, defaultValue: 'I have read and agree to all terms and conditions.' },
  { key: 'checkout.termsWarning', value: 'Please agree to the terms before proceeding.', type: 'text', page: 'checkout', label: 'Terms Warning', group: 'Checkout & Invoice', sortOrder: 4, defaultValue: 'Please agree to the terms before proceeding.' },
  { key: 'checkout.payButton', value: 'Pay via SSLCommerz', type: 'text', page: 'checkout', label: 'Pay Button', group: 'Checkout & Invoice', sortOrder: 5, defaultValue: 'Pay via SSLCommerz' },
  { key: 'checkout.couponPlaceholder', value: 'Enter coupon code', type: 'text', page: 'checkout', label: 'Coupon Placeholder', group: 'Checkout & Invoice', sortOrder: 6, defaultValue: 'Enter coupon code' },

  // ── INVOICE ──
  { key: 'invoice.orgName', value: "Rent Bike Cox's Bazar", type: 'text', page: 'invoice', label: 'Organization Name', group: 'Checkout & Invoice', sortOrder: 7, defaultValue: "Rent Bike Cox's Bazar" },
  { key: 'invoice.contact1', value: '0189154443', type: 'text', page: 'invoice', label: 'Contact Number 1', group: 'Checkout & Invoice', sortOrder: 8, defaultValue: '0189154443' },
  { key: 'invoice.contact2', value: '01764466757', type: 'text', page: 'invoice', label: 'Contact Number 2', group: 'Checkout & Invoice', sortOrder: 9, defaultValue: '01764466757' },
  { key: 'invoice.termsTitle', value: 'Terms & Conditions', type: 'text', page: 'invoice', label: 'Terms Title', group: 'Checkout & Invoice', sortOrder: 10, defaultValue: 'Terms & Conditions' },
  { key: 'invoice.signatureOwner', value: 'Owner Signature', type: 'text', page: 'invoice', label: 'Owner Signature Label', group: 'Checkout & Invoice', sortOrder: 11, defaultValue: 'Owner Signature' },
  { key: 'invoice.signatureRenter', value: 'Renter Signature', type: 'text', page: 'invoice', label: 'Renter Signature Label', group: 'Checkout & Invoice', sortOrder: 12, defaultValue: 'Renter Signature' },

  // ── POLICIES ──
  { key: 'policies.title', value: 'Rental Policies & Terms', type: 'text', page: 'policies', label: 'Page Title', group: 'Policies', sortOrder: 1, defaultValue: 'Rental Policies & Terms' },
  { key: 'policies.introText', value: 'Please review our rental policies before booking.', type: 'text', page: 'policies', label: 'Intro Text', group: 'Policies', sortOrder: 2, defaultValue: 'Please review our rental policies before booking.' },

  // ── FAQ ──
  { key: 'faq.title', value: 'Frequently Asked Questions', type: 'text', page: 'faq', label: 'Page Title', group: 'Help Pages', sortOrder: 1, defaultValue: 'Frequently Asked Questions' },
  { key: 'faq.subtitle', value: 'Find answers to common questions', type: 'text', page: 'faq', label: 'Page Subtitle', group: 'Help Pages', sortOrder: 2, defaultValue: 'Find answers to common questions' },

  // ── CONTACT ──
  { key: 'contact.title', value: 'Get in Touch', type: 'text', page: 'contact', label: 'Page Title', group: 'Help Pages', sortOrder: 3, defaultValue: 'Get in Touch' },
  { key: 'contact.subtitle', value: "We'd love to hear from you.", type: 'text', page: 'contact', label: 'Page Subtitle', group: 'Help Pages', sortOrder: 4, defaultValue: "We'd love to hear from you." },
  { key: 'contact.successMessage', value: 'Message sent successfully! We will get back to you within 24 hours.', type: 'text', page: 'contact', label: 'Success Message', group: 'Help Pages', sortOrder: 5, defaultValue: 'Message sent successfully!' },

  // ── 404 ──
  { key: 'notFound.title', value: 'Page Not Found', type: 'text', page: 'notFound', label: '404 Title', group: 'Error Pages', sortOrder: 1, defaultValue: 'Page Not Found' },
  { key: 'notFound.message', value: 'The page you are looking for does not exist.', type: 'text', page: 'notFound', label: '404 Message', group: 'Error Pages', sortOrder: 2, defaultValue: 'The page you are looking for does not exist.' },
  { key: 'notFound.buttonText', value: 'Go Home', type: 'text', page: 'notFound', label: '404 Button', group: 'Error Pages', sortOrder: 3, defaultValue: 'Go Home' },

  // ── PAYMENT FAILED ──
  { key: 'paymentFailed.title', value: 'Payment Failed', type: 'text', page: 'paymentFailed', label: 'Page Title', group: 'Error Pages', sortOrder: 4, defaultValue: 'Payment Failed' },
  { key: 'paymentFailed.message', value: 'Your payment could not be processed. Please try again.', type: 'text', page: 'paymentFailed', label: 'Error Message', group: 'Error Pages', sortOrder: 5, defaultValue: 'Your payment could not be processed. Please try again.' },

  // ── PAYMENT CANCELLED ──
  { key: 'paymentCancelled.title', value: 'Payment Cancelled', type: 'text', page: 'paymentCancelled', label: 'Page Title', group: 'Error Pages', sortOrder: 6, defaultValue: 'Payment Cancelled' },
  { key: 'paymentCancelled.message', value: 'You cancelled the payment. No charges were made.', type: 'text', page: 'paymentCancelled', label: 'Message', group: 'Error Pages', sortOrder: 7, defaultValue: 'You cancelled the payment. No charges were made.' },

  // ── GLOBAL ──
  { key: 'global.businessName', value: "Rent Bike Cox's Bazar", type: 'text', page: 'global', section: 'business', label: 'Business Name', description: 'Business name used across site', group: 'Global', sortOrder: 1, defaultValue: "Rent Bike Cox's Bazar" },
  { key: 'global.businessTagline', value: "Your ride, your way", type: 'text', page: 'global', section: 'business', label: 'Business Tagline', group: 'Global', sortOrder: 2, defaultValue: 'Your ride, your way' },
  { key: 'global.currency', value: 'BDT', type: 'text', page: 'global', section: 'formatting', label: 'Currency Code', group: 'Global', sortOrder: 3, defaultValue: 'BDT' },
  { key: 'global.currencySymbol', value: '৳', type: 'text', page: 'global', section: 'formatting', label: 'Currency Symbol', group: 'Global', sortOrder: 4, defaultValue: '৳' },
  { key: 'global.loadingText', value: 'Loading...', type: 'text', page: 'global', section: 'ui', label: 'Loading Text', group: 'Global', sortOrder: 5, defaultValue: 'Loading...' },
  { key: 'global.errorGeneric', value: 'Something went wrong. Please try again.', type: 'text', page: 'global', section: 'ui', label: 'Generic Error', group: 'Global', sortOrder: 6, defaultValue: 'Something went wrong. Please try again.' },
  { key: 'global.retryText', value: 'Try Again', type: 'text', page: 'global', section: 'ui', label: 'Retry Button', group: 'Global', sortOrder: 7, defaultValue: 'Try Again' },
  { key: 'global.noDataText', value: 'No data found', type: 'text', page: 'global', section: 'ui', label: 'No Data Message', group: 'Global', sortOrder: 8, defaultValue: 'No data found' },
];

const PAGES = [...new Set(contentItems.map(i => i.page))];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const SiteContent = require('../models/SiteContent');

    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    for (const item of contentItems) {
      const existing = await SiteContent.findOne({ key: item.key });
      if (existing) {
        const needsUpdate = (
          existing.label !== item.label ||
          existing.description !== item.description ||
          existing.type !== item.type ||
          existing.group !== item.group ||
          existing.sortOrder !== item.sortOrder ||
          existing.section !== (item.section || '') ||
          existing.placeholder !== (item.placeholder || '') ||
          existing.isLocked !== false
        );
        if (needsUpdate) {
          await SiteContent.updateOne({ key: item.key }, {
            $set: {
              label: item.label,
              description: item.description,
              type: item.type,
              group: item.group,
              sortOrder: item.sortOrder,
              section: item.section || '',
              placeholder: item.placeholder || '',
              defaultValue: item.defaultValue !== undefined ? item.defaultValue : undefined
            }
          });
          updated++;
        }
        skipped++;
        continue;
      }
      await SiteContent.create({
        key: item.key,
        value: item.defaultValue !== undefined ? item.defaultValue : item.value,
        type: item.type,
        page: item.page,
        section: item.section || '',
        label: item.label || '',
        description: item.description || '',
        placeholder: item.placeholder || '',
        defaultValue: item.defaultValue !== undefined ? item.defaultValue : undefined,
        group: item.group || '',
        sortOrder: item.sortOrder || 0
      });
      inserted++;
    }

    console.log(`Seeding complete: ${inserted} inserted, ${updated} updated, ${skipped} existing`);
    console.log(`Total content keys: ${contentItems.length}, Pages: ${PAGES.join(', ')}`);
    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
}

seed();
