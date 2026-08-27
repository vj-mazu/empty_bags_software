import React, { useState, useEffect } from 'react';
import { getPlaces, getPlaceLedger } from '../api';
import { formatDate, formatBags } from '../utils/formatters';

const PlaceStockLedger = () => {
  const [places, setPlaces] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlaces().then(res => setPlaces(res.results || res.data || res)).catch(console.error);
  }, []);

  const fetchLedger = (placeId) => {
    setLoading(true);
    getPlaceLedger(placeId)
      .then(res => setLedgerData(res.results || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLedger(selectedPlaceId);
  }, [selectedPlaceId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fas fa-map-location-dot" style={{ color: '#2563eb' }}></i> Inter-Branch Place Stock Ledger
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>
              Track stock transfers received from Main Mill vs sales and remaining bag inventory per location.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569', textTransform: 'uppercase' }}>Filter Place:</label>
            <select 
              className="input" 
              value={selectedPlaceId} 
              onChange={e => setSelectedPlaceId(e.target.value)} 
              style={{ width: '220px' }}
            >
              <option value="">All Places / Branches</option>
              {places.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button className="btn btn-ghost" onClick={() => fetchLedger(selectedPlaceId)}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Loading Place Stock Ledger...</p>
        </div>
      ) : ledgerData.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-box-open fa-3x" style={{ opacity: 0.4, marginBottom: '0.75rem' }}></i>
          <h3>No Place Stock Transfers Found</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Create an Outward entry with <b>Inter-Branch Transfer</b> toggled ON to send stock to a Place.
          </p>
        </div>
      ) : (
        ledgerData.map(placeItem => (
          <div key={placeItem.place_id} className="card" style={{ padding: '1.25rem' }}>
            {/* Summary Row Cards */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-building" style={{ color: '#2563eb', marginRight: '6px' }}></i> {placeItem.place_name} Stock Position
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                <div style={{ padding: '0.5rem 1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>TRANSFERRED IN</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>{formatBags(placeItem.transferred_in_bags)} Bags</span>
                </div>
                <div style={{ padding: '0.5rem 1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>SOLD / DISPATCHED</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{formatBags(placeItem.sales_bags)} Bags</span>
                </div>
                <div style={{ padding: '0.5rem 1rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>BALANCE AT BRANCH</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>{formatBags(placeItem.remaining_bags)} Bags</span>
                </div>
              </div>
            </div>

            {/* Tables: Transferred Received vs Sales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid">
              {/* Inward Transfers Received */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fas fa-truck-ramp-box"></i> Stock Transferred In ({placeItem.recent_transfers.length})
                </h4>
                <div className="tbl-wrap" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  <table style={{ fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Date (DD/MM/YYYY)</th>
                        <th>From Location</th>
                        <th>Variety</th>
                        <th style={{ textAlign: 'center' }}>Bags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placeItem.recent_transfers.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>No transfers received yet</td></tr>
                      ) : (
                        placeItem.recent_transfers.map(t => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 700, color: '#2563eb' }}>{t.invoice_no}</td>
                            <td style={{ color: '#475569' }}>{formatDate(t.date)}</td>
                            <td style={{ fontWeight: 600 }}>{t.from_place}</td>
                            <td style={{ fontWeight: 600 }}>{t.variety_name}</td>
                            <td style={{ fontWeight: 800, textAlign: 'center', color: '#2563eb' }}>+{formatBags(t.bags)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sales at Place */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fas fa-shopping-cart"></i> Sales / Outward at Place ({placeItem.recent_sales.length})
                </h4>
                <div className="tbl-wrap" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  <table style={{ fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Date (DD/MM/YYYY)</th>
                        <th>Party</th>
                        <th>Variety</th>
                        <th style={{ textAlign: 'center' }}>Bags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placeItem.recent_sales.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>No sales recorded at this place yet</td></tr>
                      ) : (
                        placeItem.recent_sales.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 700, color: '#2563eb' }}>{s.invoice_no}</td>
                            <td style={{ color: '#475569' }}>{formatDate(s.date)}</td>
                            <td style={{ fontWeight: 600 }}>{s.party_name}</td>
                            <td style={{ fontWeight: 600 }}>{s.variety_name}</td>
                            <td style={{ fontWeight: 800, textAlign: 'center', color: '#ef4444' }}>-{formatBags(s.bags)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default PlaceStockLedger;
