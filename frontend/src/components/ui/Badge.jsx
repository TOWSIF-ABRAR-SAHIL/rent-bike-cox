const badgeStyles = {
  success: { background: 'var(--success-bg)', color: 'var(--success-text)', borderColor: 'var(--success-border)' },
  warning: { background: 'var(--warning-bg)', color: 'var(--warning-text)', borderColor: 'var(--warning-border)' },
  danger: { background: 'var(--danger-bg)', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' },
  info: { background: 'var(--info-bg)', color: 'var(--info-text)', borderColor: 'var(--info-border)' },
  purple: { background: 'var(--purple-bg)', color: 'var(--purple-text)', borderColor: 'var(--purple-border)' },
  default: { background: 'var(--hover-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border-base)' },
};

const Badge = ({ children, variant = 'default', glow, className = '' }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${glow ? 'shadow-lg' : ''} ${className}`}
    style={badgeStyles[variant] || badgeStyles.default}
  >
    {children}
  </span>
);

export default Badge;
