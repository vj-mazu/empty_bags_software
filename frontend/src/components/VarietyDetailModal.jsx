import React, { useState, useEffect } from 'react';
import { getVarietyLedger } from '../api';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
};

export default function VarietyDetailModal({ varietyId, onClose, initialFilters = {} }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(initialFilters.start_date || '');
  const [endDate, setEndDate] = useState(initialFilters.end_date || '');
  const [month, setMonth] = useState(initialFilters.month || '');
  const [invoiceNo, setInvoiceNo] = useState('');

  useEffect(() => {
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const params = {};
      if (invoiceNo) params.invoice_no = invoiceNo;
      if (month) params.month = month;
      else {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }
      const res = await getVarietyLedger(varietyId, params);
      setData(res);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleApplyFilter = () => {
    fetchDetail();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setMonth('');
    setInvoiceNo('');
    setLoading(true);
    getVarietyLedger(varietyId, {}).then(res => {
      setData(res);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: '980px', width: '95%' }}>
        <div className="modal-hdr" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div className="modal-title" style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-wheat-awn"></i> Detailed Itemized Variety Ledger: {data?.variety?.name || 'Loading...'}
            {data?.variety?.kgs_per_bag && (
              <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {data.variety.kgs_per_bag} kg/bag
              </span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Filter Bar Inside Modal */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', margin: '0.85rem 0', flexWrap: 'wrap', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
            <label style={{ fontWeight: 600, color: '#475569' }}>Invoice No:</label>
            <input 
              type="text" 
              placeholder="Search Invoice..." 
              value={invoiceNo} 
              onChange={(e) => setInvoiceNo(e.target.value)} 
              style={{ padding: '0.25rem 0.4rem', fontSize: '0.76rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: '130px' }} 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
            <label style={{ fontWeight: 600, color: '#475569' }}>Month:</label>
            <input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setStartDate(''); setEndDate(''); }} style={{ padding: '0.25rem 0.4rem', fontSize: '0.76rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
            <label style={{ fontWeight: 600, color: '#475569' }}>From:</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setMonth(''); }} style={{ padding: '0.25rem 0.4rem', fontSize: '0.76rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
            <label style={{ fontWeight: 600, color: '#475569' }}>To:</label>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setMonth(''); }} style={{ padding: '0.25rem 0.4rem', fontSize: '0.76rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>

          <button className="btn btn-blue btn-sm" onClick={handleApplyFilter}>
            <i className="fas fa-search"></i> Filter
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleClearFilter}>
            Clear
          </button>
        </div>

        {/* Itemized Transactions Table */}
        <div className="tbl-wrap" style={{ maxHeight: '420px', overflowY: 'auto' }}>
          <table style={{ fontSize: '0.74rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '5%' }}>SL</th>
                <th style={{ textAlign: 'center', width: '10%' }}>Type</th>
                <th style={{ width: '14%' }}>Invoice No</th>
                <th style={{ width: '12%' }}>Date</th>
                <th style={{ width: '20%' }}>Party Name</th>
                <th style={{ textAlign: 'center', width: '8%' }}>Bags</th>
                <th style={{ textAlign: 'right', width: '10%' }}>Rate</th>
                <th style={{ textAlign: 'right', width: '10%' }}>p/b cost</th>
                <th style={{ textAlign: 'right', width: '11%' }}>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem' }}>Loading transaction ledger...</td></tr>
              ) : (
                data?.transactions?.map((t, idx) => (
                  <tr key={`${t.type}-${t.id}-${idx}`}>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${t.type === 'inward' ? 'badge-green' : 'badge-red'}`}>
                        {t.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{t.invoice_no || '-'}</td>
                    <td style={{ color: '#64748b' }}>{t.date}</td>
                    <td style={{ fontWeight: 600, color: '#334155' }}>{t.party_name}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: t.type === 'inward' ? '#059669' : '#dc2626' }}>
                      {t.type === 'inward' ? `+${t.bags}` : `-${t.bags}`}
                    </td>
                    <td style={{ textAlign: 'right' }}>₹{t.rate}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>₹{(t.per_bag_cost || t.rate).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatINR(t.total_value)}</td>
                  </tr>
                ))
              )}
              {!loading && (!data?.transactions || data.transactions.length === 0) && (
                <tr><td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>No itemized transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
