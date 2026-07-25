const PrivacyPolicy = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h1>
        <div className="glass rounded-2xl p-6 sm:p-8 space-y-6" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Information We Collect</h2>
            <p>We collect your name, email, phone number, NID (National ID), and driving license information for verification purposes. Vehicle images and rental history are also stored.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>How We Use Your Information</h2>
            <p>Your information is used for identity verification, processing rentals, payment processing, and customer support. We do not sell your personal data to third parties.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Data Security</h2>
            <p>We implement industry-standard encryption for sensitive data including NID, license, and phone numbers. All payment processing is handled through SSLCommerz, a PCI-DSS compliant gateway.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Data Retention</h2>
            <p>Account data is retained while your account is active. Booking and financial records are retained for 7 years as required by law. You may request data deletion by contacting support.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. Contact us at the numbers provided on our website to exercise these rights.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Contact</h2>
            <p>For privacy-related inquiries, contact us at 0189154443 or 01764466757.</p>
          </section>
          <p className="text-sm pt-4" style={{ color: 'var(--text-muted)' }}>Last updated: July 2026</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
