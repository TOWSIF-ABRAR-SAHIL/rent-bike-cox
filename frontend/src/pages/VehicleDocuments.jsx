import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import DocumentUpload from '../components/DocumentUpload';
import DocumentViewer from '../components/DocumentViewer';
import { FileText, AlertTriangle, ChevronLeft } from 'lucide-react';

export default function VehicleDocuments() {
  const { user } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [selectedBike, setSelectedBike] = useState(null);
  const [docs, setDocs] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBikes = async () => {
      try {
        const { data } = await api.get('/dashboard/bikes');
        const myBikes = user.role === 'Admin' ? data : data.filter(b => b.renter?._id === user.id || b.renter === user.id);
        setBikes(myBikes);
      } catch { /* */ } finally { setLoading(false); }
    };
    fetchBikes();

    api.get('/vehicle-docs/expiring?days=30').then(({ data }) => setExpiring(data)).catch(() => {});
  }, [user]);

  const fetchDocs = async (bikeId) => {
    setSelectedBike(bikeId);
    try {
      const { data } = await api.get(`/vehicle-docs/bike/${bikeId}`);
      setDocs(data);
    } catch { setDocs([]); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete document?')) return;
    await api.delete(`/vehicle-docs/${id}`);
    fetchDocs(selectedBike);
  };

  const handleVerify = async (id) => {
    await api.patch(`/vehicle-docs/${id}/verify`);
    fetchDocs(selectedBike);
  };

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText size={28} className="text-amber-400" />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Vehicle Documents</h1>
      </div>

      {expiring.length > 0 && (
        <div className="mb-6 rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertTriangle size={20} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">Expiring Soon</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {expiring.length} document(s) expiring within 30 days
            </p>
          </div>
        </div>
      )}

      {!selectedBike ? (
        <div className="space-y-3">
          {bikes.length === 0 ? (
            <div className="text-center py-8 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--card-bg)', border: '1px solid var(--border-base)' }}>
              No vehicles found.
            </div>
          ) : (
            bikes.map(bike => (
              <button
                key={bike._id}
                onClick={() => fetchDocs(bike._id)}
                className="w-full text-left flex items-center justify-between rounded-xl p-4 transition-all hover:opacity-90"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-base)' }}
               aria-label="View vehicle documents">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bike.brand} {bike.model}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bike.category?.name || 'Vehicle'}</p>
                </div>
                <FileText size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            ))
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => { setSelectedBike(null); setDocs([]); }}
            className="flex items-center gap-1 text-sm mb-4 transition-colors hover:opacity-80"
            style={{ color: 'var(--accent-text)' }}
           aria-label="Go back to vehicle list">
            <ChevronLeft size={16} /> Back to vehicles
          </button>

          <div className="mb-6">
            <DocumentUpload bikeId={selectedBike} onUploaded={() => fetchDocs(selectedBike)} />
          </div>

          <DocumentViewer documents={docs} onVerify={user.role === 'Admin' ? handleVerify : undefined} onDelete={handleDelete} />
        </div>
      )}
    </div>
  );
}
