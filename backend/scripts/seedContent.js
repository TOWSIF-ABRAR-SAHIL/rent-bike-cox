const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike';

const contentItems = [
  // ── HOME / HERO ──
  { key: 'home.hero.pillText', value: "Cox's Bazar, Bangladesh", type: 'text', page: 'home', description: 'Small pill badge above hero title' },
  { key: 'home.hero.title', value: "Explore Cox's Bazar on Two Wheels", type: 'text', page: 'home', description: 'Main hero heading' },
  { key: 'home.hero.titleHighlight', value: 'Two Wheels', type: 'text', page: 'home', description: 'Highlighted part of hero title' },
  { key: 'home.hero.subtitle', value: "Rent bikes, cars & beach jeeps at the world's longest beach. Best prices, verified vehicles, secure online payment.", type: 'text', page: 'home', description: 'Hero subtitle text' },
  { key: 'home.hero.ctaText', value: 'Browse Vehicles', type: 'text', page: 'home', description: 'Hero call-to-action button text' },

  // ── HOME / FEATURES ──
  { key: 'home.features.title', value: 'Why Choose Us', type: 'text', page: 'home', description: 'Features section heading' },
  { key: 'home.features.subtitle', value: "The best vehicle rental experience in Cox's Bazar", type: 'text', page: 'home', description: 'Features section subtitle' },
  { key: 'home.features.items', value: JSON.stringify([
    { title: 'Verified Vehicles', desc: 'Every vehicle is inspected and verified before listing', icon: 'Shield' },
    { title: 'Secure Payment', desc: 'Pay safely via SSLCommerz — bKash, Nagad, Card, Bank', icon: 'CreditCard' },
    { title: '24/7 Support', desc: 'Reach us anytime at 01891-154443 or 01764-466757', icon: 'Headphones' },
    { title: 'Instant Booking', desc: 'Book your ride in seconds with instant confirmation', icon: 'Zap' }
  ]), type: 'json', page: 'home', description: 'Feature cards (array of {title, desc, icon})' },

  // ── HOME / HOW IT WORKS ──
  { key: 'home.steps.title', value: 'How It Works', type: 'text', page: 'home', description: 'Steps section heading' },
  { key: 'home.steps.subtitle', value: 'Three simple steps to your ride', type: 'text', page: 'home', description: 'Steps section subtitle' },
  { key: 'home.steps.items', value: JSON.stringify([
    { num: '01', title: 'Browse', desc: 'Find the perfect bike, car or jeep' },
    { num: '02', title: 'Book', desc: 'Select dates, apply coupon, pay advance' },
    { num: '03', title: 'Ride', desc: "Pick up and explore Cox's Bazar" }
  ]), type: 'json', page: 'home', description: 'How It Works steps' },

  // ── HOME / TESTIMONIALS ──
  { key: 'home.testimonials.title', value: 'What Riders Say', type: 'text', page: 'home', description: 'Testimonials section heading' },
  { key: 'home.testimonials.subtitle', value: "Real experiences from our customers in Cox's Bazar", type: 'text', page: 'home', description: 'Testimonials subtitle' },
  { key: 'home.testimonials.items', value: JSON.stringify([
    { name: 'Rahim Uddin', role: 'Tourist from Dhaka', text: "Rented a bike for 3 days. The booking process was super easy and the bike was in great condition. Highly recommend for exploring Cox's Bazar!", rating: 5, vehicle: 'TVS Scooty' },
    { name: 'Fatima Ahmed', role: 'Local Resident', text: "Best rental service in Cox's Bazar. Affordable prices and the online payment was seamless. Will definitely use again.", rating: 5, vehicle: 'Honda CB Shine' },
    { name: 'Kamal Hossain', role: 'Adventure Seeker', text: 'Took a jeep to Himchari. Amazing experience! The vehicle was well-maintained and the pickup was right on time.', rating: 4, vehicle: 'Mahindra Thar' }
  ]), type: 'json', page: 'home', description: 'Customer testimonials (array of {name, role, text, rating, vehicle})' },

  // ── HOME / EXPLORE ZONES ──
  { key: 'home.zones.title', value: 'Explore Zones', type: 'text', page: 'home', description: 'Zones section heading' },
  { key: 'home.zones.subtitle', value: "Discover rental zones across Cox's Bazar — from city center to St. Martin's Island", type: 'text', page: 'home', description: 'Zones section subtitle' },

  // ── FOOTER ──
  { key: 'footer.aboutText', value: "Your trusted vehicle rental platform in Cox's Bazar. Bikes, cars & beach jeeps at the best prices with secure online payment.", type: 'text', page: 'footer', description: 'Footer about paragraph' },
  { key: 'footer.copyrightText', value: "© 2026 Rent Bike Cox's Bazar. All rights reserved.", type: 'text', page: 'footer', description: 'Copyright text' },
  { key: 'footer.builtWith', value: 'Built with React, Express & MongoDB', type: 'text', page: 'footer', description: 'Built with credit' },
  { key: 'footer.contactNumbers', value: '01891-154443, 01764-466757', type: 'text', page: 'footer', description: 'Contact phone numbers' },
  { key: 'footer.address', value: "Cox's Bazar, Bangladesh", type: 'text', page: 'footer', description: 'Business address in footer' },

  // ── NOT FOUND ──
  { key: 'notFound.title', value: '404', type: 'text', page: 'notFound', description: '404 page heading' },
  { key: 'notFound.message', value: 'Page not found', type: 'text', page: 'notFound', description: '404 page message' },
  { key: 'notFound.goHomeText', value: 'Go Home', type: 'text', page: 'notFound', description: '404 go home button text' },

  // ── POLICIES ──
  { key: 'policies.title', value: 'Rental Policies & Terms', type: 'text', page: 'policies', description: 'Policies page heading' },
  { key: 'policies.introText', value: 'Please review our rental policies before booking. These policies ensure a safe and fair experience for all customers and vehicle owners.', type: 'text', page: 'policies', description: 'Intro paragraph on policies page' },

  // ── SIGNUP ──
  { key: 'signup.termsText', value: 'By creating an account, you agree to our Terms of Service and Privacy Policy. Valid NID and Driving License are required for verification.', type: 'text', page: 'signup', description: 'Terms agreement text on signup' },

  // ── CHECKOUT ──
  { key: 'checkout.termsTitle', value: 'Terms & Conditions', type: 'text', page: 'checkout', description: 'Checkout terms section heading' },
  { key: 'checkout.termsText', value: 'I have read and agree to all terms and conditions.', type: 'text', page: 'checkout', description: 'Checkout terms checkbox label' },
  { key: 'checkout.termsWarning', value: 'Please agree to the terms and conditions before proceeding.', type: 'text', page: 'checkout', description: 'Error when terms not agreed' },

  // ── FAQ ──
  { key: 'faq.title', value: 'Frequently Asked Questions', type: 'text', page: 'faq', description: 'FAQ page heading' },
  { key: 'faq.subtitle', value: "Find answers to common questions about renting vehicles in Cox's Bazar", type: 'text', page: 'faq', description: 'FAQ page subtitle' },

  // ── CONTACT ──
  { key: 'contact.title', value: 'Get in Touch', type: 'text', page: 'contact', description: 'Contact page heading' },
  { key: 'contact.subtitle', value: "Have a question or feedback? We'd love to hear from you.", type: 'text', page: 'contact', description: 'Contact page subtitle' },
  { key: 'contact.successMessage', value: 'Message sent successfully! We will get back to you within 24 hours.', type: 'text', page: 'contact', description: 'Success message after form submit' },

  // ── GLOBAL ──
  { key: 'global.businessName', value: "Rent Bike Cox's Bazar", type: 'text', page: 'global', description: 'Business name used across site' },
  { key: 'global.businessTagline', value: "Your ride, your way, in Cox's Bazar", type: 'text', page: 'global', description: 'Business tagline' },
  { key: 'global.errorGeneric', value: 'Something went wrong. Please try again.', type: 'text', page: 'global', description: 'Generic error message' },
  { key: 'global.loadingText', value: 'Loading...', type: 'text', page: 'global', description: 'Loading indicator text' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const SiteContent = require('../models/SiteContent');

    let inserted = 0;
    let skipped = 0;

    for (const item of contentItems) {
      const existing = await SiteContent.findOne({ key: item.key });
      if (existing) {
        skipped++;
        continue;
      }
      await SiteContent.create({
        key: item.key,
        value: item.value,
        type: item.type,
        page: item.page,
        description: item.description
      });
      inserted++;
    }

    console.log(`Seeding complete: ${inserted} inserted, ${skipped} skipped (already exist)`);
    console.log(`Total content keys: ${contentItems.length}`);

    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
}

seed();
