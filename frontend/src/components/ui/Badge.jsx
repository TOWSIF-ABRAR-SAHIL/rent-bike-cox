const variants = {
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  default: '',
};

const defaultBadgeStyle = {
  backgroundColor: 'var(--hover-bg)',
  color: 'var(--text-secondary)',
  borderColor: 'var(--border-base)',
};

const Badge = ({ children, variant = 'default', glow, className = '' }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${variants[variant]} ${glow ? 'shadow-lg' : ''} ${className}`}
    style={variant === 'default' ? defaultBadgeStyle : undefined}
  >
    {children}
  </span>
);

export default Badge;
