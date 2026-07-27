import { Calendar, Wrench, AlertTriangle, DollarSign, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const eventIcons = {
  booking: { icon: Calendar, color: 'var(--accent-text)', bg: 'var(--accent-bg)' },
  maintenance: { icon: Wrench, color: 'var(--warning-text)', bg: 'var(--warning-bg)' },
  status: { icon: AlertTriangle, color: 'var(--info-text)', bg: 'var(--info-bg)' },
};

const statusColors = {
  Confirmed: { text: 'var(--success-text)', bg: 'var(--success-bg)', icon: CheckCircle },
  Completed: { text: 'var(--success-text)', bg: 'var(--success-bg)', icon: CheckCircle },
  Cancelled: { text: 'var(--danger-text)', bg: 'var(--danger-bg)', icon: XCircle },
  Expired: { text: 'var(--text-muted)', bg: 'var(--input-bg)', icon: XCircle },
  Pending: { text: 'var(--warning-text)', bg: 'var(--warning-bg)', icon: Clock },
};

const HistoryTimeline = ({ events }) => {
  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: 'var(--border-base)' }} />

      <div className="space-y-4">
        {events.map((event, idx) => {
          const iconConfig = eventIcons[event.type] || eventIcons.booking;
          const Icon = iconConfig.icon;

          return (
            <div key={`${event.type}-${event.data._id}-${idx}`} className="relative flex items-start gap-4 pl-2">
              <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: iconConfig.bg, border: `2px solid var(--border-base)` }}>
                <Icon size={14} style={{ color: iconConfig.color }} />
              </div>

              <div className="flex-1 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md capitalize" style={{ background: iconConfig.bg, color: iconConfig.color }}>
                      {event.type}
                    </span>
                    {event.type === 'booking' && event.data.status && (
                      <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{
                        background: statusColors[event.data.status]?.bg || 'var(--input-bg)',
                        color: statusColors[event.data.status]?.text || 'var(--text-muted)',
                      }}>
                        {event.data.status}
                      </span>
                    )}
                    {event.type === 'maintenance' && event.data.maintenanceType && (
                      <span className="text-xs px-2 py-0.5 rounded-md capitalize" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
                        {event.data.maintenanceType}
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {event.type === 'booking' && (
                  <div className="space-y-1">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {event.data.user} — {event.data.invoiceNumber || 'Walk-in'}
                    </p>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{event.data.startTime ? new Date(event.data.startTime).toLocaleDateString() : 'N/A'}</span>
                      <ArrowRight size={10} />
                      <span>{event.data.endTime ? new Date(event.data.endTime).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      {event.data.totalPrice > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <DollarSign size={10} /> {event.data.totalPrice} TK
                        </span>
                      )}
                      {event.data.advancePaid > 0 && (
                        <span className="text-xs" style={{ color: 'var(--success-text)' }}>Paid: {event.data.advancePaid} TK</span>
                      )}
                      {event.data.refundAmount > 0 && (
                        <span className="text-xs" style={{ color: 'var(--danger-text)' }}>Refund: {event.data.refundAmount} TK</span>
                      )}
                    </div>
                    {event.data.cancellationReason && (
                      <p className="text-xs mt-1" style={{ color: 'var(--danger-text)' }}>Reason: {event.data.cancellationReason}</p>
                    )}
                  </div>
                )}

                {event.type === 'maintenance' && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{event.data.title}</p>
                    {event.data.description && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{event.data.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>By: {event.data.performedBy}</span>
                      {event.data.cost > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <DollarSign size={10} /> {event.data.cost} TK
                        </span>
                      )}
                      {event.data.mileage > 0 && (
                        <span>{event.data.mileage} km</span>
                      )}
                    </div>
                    {event.data.nextServiceDue && (
                      <p className="text-xs" style={{ color: 'var(--warning-text)' }}>
                        Next service: {new Date(event.data.nextServiceDue).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {event.type === 'status' && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {event.data.previousStatus && (
                      <>
                        <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                          {event.data.previousStatus}
                        </span>
                        <ArrowRight size={12} />
                      </>
                    )}
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                      background: statusColors[event.data.status]?.bg || 'var(--input-bg)',
                      color: statusColors[event.data.status]?.text || 'var(--text-muted)',
                    }}>
                      {event.data.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryTimeline;
