const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`text-center py-16 ${className}`}>
    {Icon && (
      <div className="w-20 h-20 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon size={32} className="text-gray-500" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
    {description && <p className="text-gray-400 text-sm max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
