const TermsOfService = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Terms of Service</h1>
        <div className="glass rounded-2xl p-6 sm:p-8 space-y-6" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Rental Agreement</h2>
            <p>By renting a vehicle through Rent Bike Cox&apos;s Bazar, you agree to use it responsibly and in compliance with all traffic laws. You must be 18+ with a valid driving license.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Insurance &amp; Liability</h2>
            <p><strong>No insurance is provided.</strong> The renter is fully responsible for any accidents, damage, or theft during the rental period. All repair or replacement costs will be borne by the renter.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Fuel Policy</h2>
            <p>Fuel costs are always the responsibility of the customer. Vehicles must be returned with the same fuel level as at pickup.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Cancellation Policy</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>More than 24 hours before pickup: 100% refund</li>
              <li>12-24 hours before pickup: 50% refund</li>
              <li>Less than 12 hours before pickup: No refund</li>
              <li>No-show: No refund</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Payments</h2>
            <p>All payments are processed securely through SSLCommerz. An advance payment is required at booking. The remaining balance is due at vehicle pickup.</p>
          </section>
          <p className="text-sm pt-4" style={{ color: 'var(--text-muted)' }}>Last updated: July 2026</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
