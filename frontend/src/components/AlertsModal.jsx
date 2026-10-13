import { useState, useEffect } from 'react';
import { getAlerts } from '../api';

export default function AlertsModal({ onClose }) {
  const [alerts, setAlerts] = useState({ low_stock_alerts: [], aging_stock_alerts: [] });
  const [loading, setLoading] = useState(true);
  const [mutedIds, setMutedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mother_india_muted_alerts') || '[]');
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    getAlerts()
      .then(data => {
        setAlerts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch alerts:', err);
        setLoading(false);
      });
  }, []);

  const toggleMute = (varietyId) => {
    setMutedIds(prev => {
      let updated;
      if (prev.includes(varietyId)) {
        updated = prev.filter(id => id !== varietyId);
      } else {
        updated = [...prev, varietyId];
      }
      try {
        localStorage.setItem('mother_india_muted_alerts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const activeLowAlerts = (alerts.low_stock_alerts || []).filter(a => !mutedIds.includes(a.variety_id));
  const mutedLowAlerts = (alerts.low_stock_alerts || []).filter(a => mutedIds.includes(a.variety_id));
  const activeAgingAlerts = alerts.aging_stock_alerts || [];
  const totalCount = activeLowAlerts.length + activeAgingAlerts.length;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '640px', width: '92%' }}>
        <div className="modal-hdr">
          <div className="modal-title">
            <i className="fas fa-bell" style={{ color: '#ef4444' }}></i> System Notifications & Alerts
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin"></i> Checking stock alerts...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '430px', overflowY: 'auto', paddingRight: '4px' }}>
            {totalCount === 0 && mutedLowAlerts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', background: '#f8fafc', borderRadius: '6px' }}>
                <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                <p style={{ margin: 0, fontWeight: 600 }}>All stock levels are healthy! No active alerts.</p>
              </div>
            )}
            
            {activeLowAlerts.map((alert, index) => (
              <div key={`low-${index}`} className="alert-item alert-low" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <i className="fas fa-triangle-exclamation" style={{ marginTop: '0.2rem' }}></i>
                  <div>
                    <div style={{ fontWeight: 700 }}>Low Stock Warning: {alert.variety_name}</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>{alert.message || JSON.stringify(alert)}</div>
                  </div>
                </div>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => toggleMute(alert.variety_id)} 
                  title="Mute recurring alerts for this variety"
                  style={{ whiteSpace: 'nowrap', fontSize: '0.74rem', padding: '4px 8px', border: '1px solid #fca5a5', background: '#fff', color: '#b91c1c' }}
                >
                  <i className="fas fa-bell-slash"></i> Mute Alert
                </button>
              </div>
            ))}

            {activeAgingAlerts.map((alert, index) => (
              <div key={`aging-${index}`} className="alert-item alert-aging">
                <i className="fas fa-clock" style={{ marginTop: '0.15rem' }}></i>
                <div>
                  <div style={{ fontWeight: 700 }}>Aging Stock Warning</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>{alert.message || JSON.stringify(alert)}</div>
                </div>
              </div>
            ))}

            {mutedLowAlerts.length > 0 && (
              <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i className="fas fa-bell-slash"></i> Muted Variety Alerts ({mutedLowAlerts.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {mutedLowAlerts.map((alert, index) => (
                    <div key={`muted-${index}`} className="alert-item" style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <i className="fas fa-volume-xmark" style={{ color: '#94a3b8' }}></i>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{alert.variety_name} (Muted)</div>
                          <div style={{ fontSize: '0.74rem' }}>{alert.current_bags} bags remaining</div>
                        </div>
                      </div>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => toggleMute(alert.variety_id)}
                        style={{ fontSize: '0.74rem', padding: '3px 8px', background: '#ffffff', border: '1px solid #cbd5e1' }}
                      >
                        <i className="fas fa-bell"></i> Unmute
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Muted alerts will not pop up continuously.
          </span>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
