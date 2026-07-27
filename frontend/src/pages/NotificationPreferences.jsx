import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { Bell, Mail, Smartphone, Monitor, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const CHANNELS = [
  { key: 'email', label: 'Email', icon: Mail, description: 'Receive notifications via email' },
  { key: 'push', label: 'Push', icon: Smartphone, description: 'Browser push notifications' },
  { key: 'inApp', label: 'In-App', icon: Monitor, description: 'Notifications within the app' },
];

const TYPES = [
  { key: 'bookingConfirmation', label: 'Booking Confirmation' },
  { key: 'paymentConfirmation', label: 'Payment Confirmation' },
  { key: 'bookingCancellation', label: 'Booking Cancellation' },
  { key: 'maintenanceReminder', label: 'Maintenance Reminder' },
  { key: 'promotional', label: 'Promotions & Offers' },
];

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushSupported] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

  const checkPushSubscription = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkPushSubscription();
    api.get('/notification-preferences').then(({ data }) => {
      setPrefs(data);
    }).catch(() => {
      setPrefs({ email: {}, push: {}, inApp: {} });
    }).finally(() => setLoading(false));
  }, [checkPushSubscription]);

  const togglePush = useCallback(async () => {
    if (pushLoading) return;
    setPushLoading(true);
    setPushMsg('');
    try {
      if (pushEnabled) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
          await sub.unsubscribe();
        }
        setPushEnabled(false);
        setPushMsg('Push notifications disabled');
      } else {
        const { data } = await api.get('/push/vapid-public-key');
        const reg = await navigator.serviceWorker.register('/push-sw.js');
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
        await api.post('/push/subscribe', { subscription: { endpoint: sub.endpoint, keys: sub.toJSON().keys } });
        setPushEnabled(true);
        setPushMsg('Push notifications enabled!');
      }
    } catch (err) {
      setPushMsg(err.response?.data?.message || 'Failed to update push notifications');
    } finally {
      setPushLoading(false);
    }
  }, [pushEnabled, pushLoading]);

  const toggle = (channel, type) => {
    setPrefs(p => ({
      ...p,
      [channel]: { ...p[channel], [type]: !p[channel]?.[type] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/notification-preferences', prefs);
    } catch { /* */ } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading...</div>;
  if (!prefs) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Failed to load preferences.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Bell size={28} className="text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Notification Settings</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose how you want to be notified</p>
        </div>
      </div>

      {pushSupported && (
        <div className="glass rounded-xl p-4 mb-6 flex items-center justify-between" style={{ border: '1px solid var(--border-base)' }}>
          <div className="flex items-center gap-3">
            <Smartphone size={20} style={{ color: 'var(--accent-text)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Browser Push Notifications</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Get notified even when the tab is closed</p>
            </div>
          </div>
          <button
            onClick={togglePush}
            disabled={pushLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: pushEnabled ? 'var(--danger-bg)' : 'var(--accent-bg-solid, #f59e0b)',
              color: pushEnabled ? 'var(--danger-text)' : '#fff',
            }}
            aria-label={pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}
          >
            {pushLoading ? <RefreshCw size={14} className="animate-spin" /> : pushEnabled ? <><AlertCircle size={14} /> Disable</> : <><CheckCircle size={14} /> Enable</>}
          </button>
        </div>
      )}
      {pushMsg && (
        <p className="text-xs mb-4 px-1" style={{ color: pushMsg.includes('Failed') ? 'var(--danger-text)' : 'var(--success-text)' }}>{pushMsg}</p>
      )}

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-base)' }}>
        <div className="grid grid-cols-4 gap-0 text-xs font-medium px-4 py-3" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
          <div>Notification Type</div>
          {CHANNELS.map(ch => (
            <div key={ch.key} className="text-center flex items-center justify-center gap-1">
              <ch.icon size={12} /> {ch.label}
            </div>
          ))}
        </div>

        {TYPES.map(type => (
          <div
            key={type.key}
            className="grid grid-cols-4 gap-0 px-4 py-3 items-center"
            style={{ borderTop: '1px solid var(--border-base)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{type.label}</span>
            {CHANNELS.map(ch => (
              <div key={ch.key} className="text-center">
                <button
                  onClick={() => toggle(ch.key, type.key)}
                  className="w-10 h-5 rounded-full transition-colors relative mx-auto"
                  aria-label={`Toggle ${type.label} ${ch.label} notifications`}
                  aria-pressed={prefs[ch.key]?.[type.key]}
                  style={{
                    background: prefs[ch.key]?.[type.key] ? 'var(--accent-bg-solid, #f59e0b)' : 'var(--border-base)',
                  }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                    style={{ left: prefs[ch.key]?.[type.key] ? '22px' : '2px' }}
                  />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm text-white mt-6 disabled:opacity-50 transition-all"
        style={{ background: 'var(--accent-bg-solid, #f59e0b)' }}
       aria-label="Save changes">
        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
        Save Preferences
      </button>
    </div>
  );
}
