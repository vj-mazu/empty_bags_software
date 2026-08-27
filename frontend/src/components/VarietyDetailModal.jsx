import React, { useState, useEffect } from 'react';
import { getVarietyLedger } from '../api';
import { formatDate, formatINR, formatBags } from '../utils/formatters';

export default function VarietyDetailModal({ varietyId, onClose, initialFilters = {} }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(initialFilters.start_date || '');
  const [endDate, setEndDate] = useState(initialFilters.end_date || '');
  const [month, setMonth] = useState(initialFilters.month || '');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

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
    setTypeFilter('all');
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
      <div className="modal" style={{ maxWidth: '1040px', width: '95%' }}>
        <div className="modal-hdr">
          <div className="modal-title" style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <i className="fas fa-wheat-awn"></i> Itemized Transaction Ledger: {data?.variety?.name || 'Loading...'}
            {data?.variety?.kgs_per_bag && (
              <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                {data.variety.kgs_per_bag} kg/bag
              </span>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Filter Bar Inside Modal */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', margin: '0.85rem 0', flexWrap: 'wrap', border: '1px solid #e2e8f0' }}>
          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <label style={{ fontWeight: 700, color: '#475569' }}>Type:</label>
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)} 
              className="input"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <option value="all">All (Inward + Outward)</option>
              <option value="inward">Inward Only</option>
              <option value="outward">Outward Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <label style={{ fontWeight: 700, color: '#475569' }}>Invoice No:</label>
            <input 
              type="text" 
              placeholder="Search Invoice..." 
              value={invoiceNo} 
              onChange={(e) => setInvoiceNo(e.target.value)} 
              className="input"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', width: '130px' }} 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <label style={{ fontWeight: 700, color: '#475569' }}>Month:</label>
            <input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setStartDate(''); setEndDate(''); }} className="input" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <label style={{ fontWeight: 700, color: '#475569' }}>From:</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setMonth(''); }} className="input" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <label style={{ fontWeight: 700, color: '#475569' }}>To:</label>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setMonth(''); }} className="input" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} />
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
          <table style={{ fontSize: '0.78rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '30px' }}>SL</th>
                <th style={{ textAlign: 'center', width: '80px' }}>Type</th>
                <th>Invoice No</th>
                <th>Date (DD/MM/YYYY)</th>
                <th>Party / Customer</th>
                <th style={{ textAlign: 'center' }}>Bags</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>P/B Cost</th>
                <th style={{ textAlign: 'right' }}>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem' }}>Loading transaction ledger...</td></tr>
              ) : (
                (data?.transactions || [])
                  .filter(t => typeFilter === 'all' || t.type === typeFilter)
                  .map((t, idx) => (
                    <tr key={`${t.type}-${t.id}-${idx}`}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`role-pill ${t.type === 'inward' ? 'role-staff' : 'role-owner'}`}>
                          {t.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{t.invoice_no || '-'}</td>
                      <td style={{ color: '#475569', fontWeight: 600 }}>{formatDate(t.date)}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{t.party_name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: t.type === 'inward' ? '#059669' : '#dc2626' }}>
                        {t.type === 'inward' ? `+${formatBags(t.bags)}` : `-${formatBags(t.bags)}`}
                      </td>
                      <td style={{ textAlign: 'right' }}>₹{t.rate}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>₹{(t.per_bag_cost || t.rate).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatINR(t.total_value)}</td>
                    </tr>
                  ))
              )}
              {!loading && (!data?.transactions || data.transactions.filter(t => typeFilter === 'all' || t.type === typeFilter).length === 0) && (
                <tr><td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>No itemized transactions found matching filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
