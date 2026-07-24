import { useState, useEffect } from 'react';
import { getAlerts } from '../api';

export default function AlertsModal({ onClose }) {
  const [alerts, setAlerts] = useState({ low_stock_alerts: [], aging_stock_alerts: [] });
  const [loading, setLoading] = useState(true);

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

  const totalCount = (alerts.low_stock_alerts?.length || 0) + (alerts.aging_stock_alerts?.length || 0);

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '580px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
            {totalCount === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', background: '#f8fafc', borderRadius: '6px' }}>
                <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                <p style={{ margin: 0, fontWeight: 600 }}>All stock levels are healthy! No active alerts.</p>
              </div>
            )}
            
            {alerts.low_stock_alerts?.map((alert, index) => (
              <div key={`low-${index}`} className="alert-item alert-low">
                <i className="fas fa-triangle-exclamation" style={{ marginTop: '0.15rem' }}></i>
                <div>
                  <div style={{ fontWeight: 700 }}>Low Stock Warning</div>
                  <div>{alert.message || JSON.stringify(alert)}</div>
                </div>
              </div>
            ))}

            {alerts.aging_stock_alerts?.map((alert, index) => (
              <div key={`aging-${index}`} className="alert-item alert-aging">
                <i className="fas fa-clock" style={{ marginTop: '0.15rem' }}></i>
                <div>
                  <div style={{ fontWeight: 700 }}>Aging Stock Warning</div>
                  <div>{alert.message || JSON.stringify(alert)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
