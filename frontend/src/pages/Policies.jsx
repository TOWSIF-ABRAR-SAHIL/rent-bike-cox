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
    <div className="glass rounded-2xl p-6 animate-slide-up border border-white/5">
      <div className="flex items-center mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 border ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
};

const Policies = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
    <div className="text-center mb-10">
      <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
        <FileText size={28} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Rental Policies & Terms</h1>
      <p className="text-gray-400">Rent Bike Cox's Bazar — All rules and regulations</p>
    </div>

    <div className="space-y-4">
      <PolicySection icon={FileText} title="Rental Agreement" color="primary">
        <ul className="space-y-2 text-sm text-gray-400 list-disc ml-5">
          <li>Valid NID and Driving License are <strong className="text-white">mandatory</strong>.</li>
          <li>Minimum rental age: 18 years.</li>
          <li>Renter must sign the invoice before pickup.</li>
          <li>Rental period begins and ends at scheduled times.</li>
          <li>Extensions must be communicated in advance.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={CreditCard} title="Payment Policy" color="green">
        <ul className="space-y-2 text-sm text-gray-400 list-disc ml-5">
          <li><strong className="text-white">Advance payment mandatory.</strong> Order confirmed only after payment.</li>
          <li>Up to 24 hours: <strong className="text-white">50% advance</strong> required.</li>
          <li>Above 24 hours: <strong className="text-white">30% advance</strong> required.</li>
          <li>Payments via SSLCommerz (bKash, Nagad, Bank Transfer).</li>
          <li>Security deposit: <strong className="text-white">2,000 TK</strong> (cash/documents) at pickup.</li>
          <li>Remaining balance due at vehicle return.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={Fuel} title="Fuel / Petrol Policy" color="amber">
        <ul className="space-y-2 text-sm text-gray-400 list-disc ml-5">
          <li><strong className="text-white">Petrol cost borne entirely by the renter.</strong></li>
          <li>Owner will <strong className="text-white">never</strong> bear petrol costs.</li>
          <li>Vehicles provided with minimum fuel. Refuel at your expense.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={AlertTriangle} title="Fine Policies" color="red">
        <div className="grid gap-3">
          {[
            { amount: '1K', title: 'Beach Sand Violation', desc: 'Taking bike onto beach sand — strictly prohibited' },
            { amount: '2K', title: 'Helmet Violation', desc: 'Lost or damaged helmet replacement fee' },
            { amount: '5K', title: 'Boundary Violation', desc: 'Beyond Teknaf Marine Drive Zero Point' },
          ].map((fine, i) => (
            <div key={i} className="flex items-start gap-3 p-3 glass rounded-xl border border-white/5">
              <div className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-red-400 font-bold text-xs">{fine.amount}</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{fine.title}</p>
                <p className="text-xs text-gray-500">{fine.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PolicySection>

      <PolicySection icon={ShieldCheck} title="Safety Rules" color="blue">
        <ul className="space-y-2 text-sm text-gray-400 list-disc ml-5">
          <li>Driving without helmet is a <strong className="text-white">legal offense</strong>.</li>
          <li>Maximum <strong className="text-white">2 persons</strong> per bike.</li>
          <li>Speed limit: <strong className="text-white">50 km/h</strong>.</li>
          <li>All traffic laws must be followed.</li>
          <li>No driving under influence of alcohol/drugs.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={Scale} title="Accident & Damage Liability" color="red">
        <ul className="space-y-2 text-sm text-gray-400 list-disc ml-5">
          <li><strong className="text-white">Most bikes are NOT insured.</strong> Full financial responsibility on renter.</li>
          <li>Renter must <strong className="text-white">compensate owner for all damages</strong>.</li>
          <li>Report any damage to owner immediately.</li>
          <li>Repair costs deducted from security deposit.</li>
          <li>Not liable for personal injury to renter/passengers.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={Scale} title="Legal Complications" color="purple">
        <ul className="space-y-2 text-sm text-gray-400 list-disc ml-5">
          <li>All traffic fines/challans are <strong className="text-white">renter's responsibility</strong>.</li>
          <li>No illegal activity with the vehicle.</li>
          <li>No border crossings without written permission.</li>
          <li>No sub-renting to third parties.</li>
          <li>Terms violation = immediate repossession, no refund.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={RotateCcw} title="Cancellation & Refund" color="green">
        <ul className="space-y-2 text-sm text-gray-400 list-disc ml-5">
          <li>24+ hours before: <strong className="text-white">Full refund</strong></li>
          <li>12-24 hours before: <strong className="text-white">50% refund</strong></li>
          <li>Less than 12 hours: <strong className="text-white">No refund</strong></li>
          <li>No-show: <strong className="text-white">No refund</strong></li>
          <li>Refunds processed within 5-7 business days.</li>
        </ul>
      </PolicySection>

      <PolicySection icon={Shield} title="Insurance Disclaimer" color="amber">
        <ul className="space-y-2 text-sm text-gray-400 list-disc ml-5">
          <li>Most rental bikes are <strong className="text-white">not insured</strong>.</li>
          <li>RentBike Cox's Bazar does not provide insurance.</li>
          <li>Renters advised to have personal accident insurance.</li>
          <li>Security deposit is not insurance — partial damage coverage only.</li>
        </ul>
      </PolicySection>
    </div>

    <div className="mt-8 gradient-primary rounded-2xl p-6 text-white text-center">
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
