import { ShieldCheck, AlertTriangle, Phone, FileText, CreditCard, Fuel, Scale, RotateCcw, Shield } from 'lucide-react';

const PolicySection = ({ icon: Icon, title, children, color = 'primary' }) => {
  const colors = {
    primary: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up border" style={{ borderColor: 'var(--border-base)' }}>
      <div className="flex items-center mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 border ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
};

const Policies = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
    <div className="text-center mb-10">
      <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
        <FileText size={28} style={{ color: 'var(--text-primary)' }} />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Rental Policies & Terms</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Rent Bike Cox's Bazar — All rules and regulations</p>
    </div>

    <div className="space-y-4">
      <PolicySection icon={FileText} title="Rental Agreement" color="primary">
        <ul className="space-y-2 text-sm list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
          <li>Valid NID and Driving License are <strong style={{ color: 'var(--text-primary)' }}>mandatory</strong>.</li>
          <li>Minimum rental age: 18 years.</li>
          <li>Renter must sign the invoice before pickup.</li>
          <li>Rental period begins and ends at scheduled times.</li>
          <li>Extensions must be communicated in advance.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={CreditCard} title="Payment Policy" color="green">
        <ul className="space-y-2 text-sm list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
          <li><strong style={{ color: 'var(--text-primary)' }}>Advance payment mandatory.</strong> Order confirmed only after payment.</li>
          <li>Up to 24 hours: <strong style={{ color: 'var(--text-primary)' }}>50% advance</strong> required.</li>
          <li>Above 24 hours: <strong style={{ color: 'var(--text-primary)' }}>30% advance</strong> required.</li>
          <li>Payments via SSLCommerz (bKash, Nagad, Bank Transfer).</li>
          <li>Security deposit: <strong style={{ color: 'var(--text-primary)' }}>2,000 TK</strong> (cash/documents) at pickup.</li>
          <li>Remaining balance due at vehicle return.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={Fuel} title="Fuel / Petrol Policy" color="amber">
        <ul className="space-y-2 text-sm list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
          <li><strong style={{ color: 'var(--text-primary)' }}>Petrol cost borne entirely by the renter.</strong></li>
          <li>Owner will <strong style={{ color: 'var(--text-primary)' }}>never</strong> bear petrol costs.</li>
          <li>Vehicles provided with minimum fuel. Refuel at your expense.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={AlertTriangle} title="Fine Policies" color="red">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { amount: '1K', title: 'Beach Sand Violation', desc: 'Taking bike onto beach sand — strictly prohibited' },
            { amount: '2K', title: 'Helmet Violation', desc: 'Lost or damaged helmet replacement fee' },
            { amount: '5K', title: 'Boundary Violation', desc: 'Beyond Teknaf Marine Drive Zero Point' },
          ].map((fine, i) => (
            <div key={i} className="flex items-start gap-3 p-3 glass rounded-xl border" style={{ borderColor: 'var(--border-base)' }}>
              <div className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-red-400 font-bold text-xs">{fine.amount}</span>
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{fine.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fine.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PolicySection>

      <PolicySection icon={ShieldCheck} title="Safety Rules" color="blue">
        <ul className="space-y-2 text-sm list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
          <li>Driving without helmet is a <strong style={{ color: 'var(--text-primary)' }}>legal offense</strong>.</li>
          <li>Maximum <strong style={{ color: 'var(--text-primary)' }}>2 persons</strong> per bike.</li>
          <li>Speed limit: <strong style={{ color: 'var(--text-primary)' }}>50 km/h</strong>.</li>
          <li>All traffic laws must be followed.</li>
          <li>No driving under influence of alcohol/drugs.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={Scale} title="Accident & Damage Liability" color="red">
        <ul className="space-y-2 text-sm list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
          <li><strong style={{ color: 'var(--text-primary)' }}>Most bikes are NOT insured.</strong> Full financial responsibility on renter.</li>
          <li>Renter must <strong style={{ color: 'var(--text-primary)' }}>compensate owner for all damages</strong>.</li>
          <li>Report any damage to owner immediately.</li>
          <li>Repair costs deducted from security deposit.</li>
          <li>Not liable for personal injury to renter/passengers.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={Scale} title="Legal Complications" color="purple">
        <ul className="space-y-2 text-sm list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
          <li>All traffic fines/challans are <strong style={{ color: 'var(--text-primary)' }}>renter's responsibility</strong>.</li>
          <li>No illegal activity with the vehicle.</li>
          <li>No border crossings without written permission.</li>
          <li>No sub-renting to third parties.</li>
          <li>Terms violation = immediate repossession, no refund.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={RotateCcw} title="Cancellation & Refund" color="green">
        <ul className="space-y-2 text-sm list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
          <li>24+ hours before: <strong style={{ color: 'var(--text-primary)' }}>Full refund</strong></li>
          <li>12-24 hours before: <strong style={{ color: 'var(--text-primary)' }}>50% refund</strong></li>
          <li>Less than 12 hours: <strong style={{ color: 'var(--text-primary)' }}>No refund</strong></li>
          <li>No-show: <strong style={{ color: 'var(--text-primary)' }}>No refund</strong></li>
          <li>Refunds processed within 5-7 business days.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={Shield} title="Insurance Disclaimer" color="amber">
        <ul className="space-y-2 text-sm list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
          <li>Most rental bikes are <strong style={{ color: 'var(--text-primary)' }}>not insured</strong>.</li>
          <li>RentBike Cox's Bazar does not provide insurance.</li>
          <li>Renters advised to have personal accident insurance.</li>
          <li>Security deposit is not insurance — partial damage coverage only.</li>
        </ul>
      </PolicySection>
    </div>

    <div className="mt-8 gradient-primary rounded-2xl p-6 text-center" style={{ color: 'var(--text-primary)' }}>
      <Phone size={24} className="mx-auto mb-3 opacity-80" />
      <h3 className="font-bold text-lg mb-1">Questions?</h3>
      <p className="text-blue-200 text-sm mb-3">Contact us anytime</p>
      <div className="flex justify-center gap-4 text-sm">
        <span>01891154443</span>
        <span className="opacity-50">|</span>
        <span>01764466757</span>
      </div>
    </div>
  </div>
);

export default Policies;
