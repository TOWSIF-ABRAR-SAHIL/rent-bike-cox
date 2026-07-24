const Input = ({ label, icon: Icon, error, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
    <div className="relative">
      {Icon && <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary, var(--text-secondary))' }} />}
      <input
        className={`input-dark ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-xs" style={{ color: 'var(--danger-text)' }}>{error}</p>}
  </div>
);

export default Input;
