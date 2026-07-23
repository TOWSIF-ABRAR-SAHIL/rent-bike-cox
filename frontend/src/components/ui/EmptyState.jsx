import { memo } from 'react';

const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`text-center py-16 ${className}`}>
    {Icon && (
      <div className="w-20 h-20 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )}
    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    {description && <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default memo(EmptyState);
