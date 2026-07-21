const Input = ({ label, icon: Icon, error, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>}
    <div className="relative">
      {Icon && <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />}
      <input
        className={`input-dark ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export default Input;
