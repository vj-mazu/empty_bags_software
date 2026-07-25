import React, { useState, useEffect } from 'react';
import { getVarieties, getLedger, downloadLedgerPdf } from '../api';
import VarietyDetailModal from './VarietyDetailModal';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
};

const EmptyBagsLedger = () => {
  const [varieties, setVarieties] = useState([]);
  const [inwardRows, setInwardRows] = useState([]);
  const [outwardRows, setOutwardRows] = useState([]);
  const [summary, setSummary] = useState({});
  
  const [varietyId, setVarietyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [selectedVarietyId, setSelectedVarietyId] = useState(null);

  useEffect(() => {
    Promise.all([fetchVarieties(), fetchLedger()]);
  }, []);

  const fetchVarieties = async () => {
    try {
      const res = await getVarieties();
      setVarieties(res.results || res.data || res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = {};
      if (varietyId) params.variety_id = varietyId;
      if (invoiceNo) params.invoice_no = invoiceNo;
      if (month) {
        params.month = month;
      } else {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }
      
      const res = await getLedger(params);
      setInwardRows(res.inwards || []);
      setOutwardRows(res.outwards || []);
      setSummary(res.summary || {});
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleApplyFilter = () => {
    fetchLedger();
  };

  const handleClearFilter = () => {
    setVarietyId('');
    setStartDate('');
    setEndDate('');
    setMonth('');
    setInvoiceNo('');
    setLoading(true);
    getLedger({}).then(res => {
      setInwardRows(res.inwards || []);
      setOutwardRows(res.outwards || []);
      setSummary(res.summary || {});
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleDownloadPdf = () => {
    const params = {};
    if (varietyId) params.variety_id = varietyId;
    if (invoiceNo) params.invoice_no = invoiceNo;
    if (month) params.month = month;
    else {
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
    }
    downloadLedgerPdf(params);
  };

  return (
    <div>
      {/* FILTER CARD */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-hdr" style={{ padding: '0.65rem 1rem' }}>
          <div className="card-title" style={{ fontSize: '0.9rem' }}>
            <i className="fas fa-filter" style={{ color: '#2563eb' }}></i> Filter Empty Bags Stock Ledger
          </div>
        </div>

        <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1rem' }}>
          {/* Invoice No Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Invoice No</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Search Invoice..."
              value={invoiceNo} 
              onChange={(e) => setInvoiceNo(e.target.value)}
              style={{ width: '150px' }}
            />
          </div>

          {/* Month Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Select Month</label>
            <input 
              type="month" 
              className="input" 
              value={month} 
              onChange={(e) => { setMonth(e.target.value); setStartDate(''); setEndDate(''); }}
              style={{ width: '150px' }}
            />
          </div>

          {/* Date Range Start */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Start Date</label>
            <input 
              type="date" 
              className="input" 
              value={startDate} 
              onChange={(e) => { setStartDate(e.target.value); setMonth(''); }}
              style={{ width: '150px' }}
            />
          </div>

          {/* Date Range End */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>End Date</label>
            <input 
              type="date" 
              className="input" 
              value={endDate} 
              onChange={(e) => { setEndDate(e.target.value); setMonth(''); }}
              style={{ width: '150px' }}
            />
          </div>

          {/* Variety Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Filter Variety</label>
            <select 
              className="input" 
              value={varietyId} 
              onChange={(e) => setVarietyId(e.target.value)}
              style={{ width: '170px' }}
            >
              <option value="">All Varieties</option>
              {varieties.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.kgs_per_bag} kg)</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-blue" onClick={handleApplyFilter} style={{ padding: '0.45rem 1rem' }}>
              <i className="fas fa-search"></i> Filter
            </button>
            <button className="btn btn-ghost" onClick={handleClearFilter} style={{ padding: '0.45rem 1rem' }}>
              Clear
            </button>
            <button className="btn btn-green" onClick={handleDownloadPdf} style={{ padding: '0.45rem 1rem' }}>
              <i className="fas fa-file-pdf"></i> Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* SIDE-BY-SIDE REGISTERS GRID */}
      <div className="ledger-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        
        {/* INWARD EMPTY BAGS LEDGER (LEFT) */}
        <div className="card" style={{ margin: 0, borderTop: '4px solid #10b981' }}>
          <div className="card-hdr" style={{ padding: '0.5rem 0.75rem' }}>
            <div className="card-title" style={{ color: '#10b981', fontSize: '0.9rem' }}>
              <i className="fas fa-boxes-packing"></i> Inward Empty Bags Ledger Summary
            </div>
          </div>
          <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ tableLayout: 'auto', width: '100%', minWidth: '780px', fontSize: '0.72rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.35rem 0.25rem', textAlign: 'center', width: '30px' }}>SL</th>
                  <th style={{ padding: '0.35rem 0.25rem', width: '140px' }}>Variety Name</th>
                  <th style={{ padding: '0.35rem 0.25rem', width: '110px' }}>Party</th>
                  <th style={{ padding: '0.35rem 0.25rem', textAlign: 'center', width: '55px' }}>Op. Bags</th>
                  <th style={{ padding: '0.35rem 0.25rem', textAlign: 'right', width: '60px' }}>Rate</th>
                  <th style={{ padding: '0.35rem 0.25rem', textAlign: 'right', width: '70px' }}>p/b cost</th>
                  <th style={{ padding: '0.35rem 0.25rem', textAlign: 'right', width: '75px' }}>LF Total</th>
                  <th style={{ padding: '0.35rem 0.25rem', textAlign: 'center', width: '55px' }}>In. Bags</th>
                  <th style={{ padding: '0.35rem 0.25rem', textAlign: 'center', width: '65px' }}>Rem. Bags</th>
                  <th style={{ padding: '0.35rem 0.25rem', textAlign: 'right', width: '90px' }}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" style={{ textAlign: 'center', padding: '1rem' }}>Loading inward ledger...</td></tr>
                ) : (
                  inwardRows.map((row, idx) => (
                    <tr key={row.variety_id || idx}>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.25rem' }}>
                        <button 
                          onClick={() => setSelectedVarietyId(row.variety_id)} 
                          style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '0.72rem', textAlign: 'left' }}
                          title="Click to view detailed itemized transaction history"
                        >
                          <i className="fas fa-up-right-from-square" style={{ fontSize: '0.58rem', marginRight: '3px' }}></i>
                          {row.variety_name} ({row.kgs_per_bag} kg)
                        </button>
                      </td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.25rem' }}>
                        <button
                          onClick={() => setSelectedVarietyId(row.variety_id)}
                          style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, textDecoration: 'none', cursor: 'pointer', padding: 0, fontSize: '0.72rem', textAlign: 'left' }}
                          title="Click to view transaction details"
                        >
                          {row.latest_party}
                        </button>
                      </td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'center' }}>{row.opening_bags}</td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'right', fontWeight: 600 }}>₹{row.rate_per_bag}</td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>₹{row.rate_per_bag}</td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'right' }}>{row.lf_total > 0 ? formatINR(row.lf_total) : '-'}</td>
                      <td className="text-green" style={{ padding: '0.35rem 0.25rem', fontWeight: 700, textAlign: 'center' }}>+ {row.inward_bags}</td>
                      <td className="text-blue" style={{ padding: '0.35rem 0.25rem', fontSize: '0.76rem', fontWeight: 800, textAlign: 'center' }}>{row.closing_bags}</td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatINR(row.total_value)}</td>
                    </tr>
                  ))
                )}
                {!loading && inwardRows.length === 0 && (
                  <tr><td colSpan="10" style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No inward records.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OUTWARD EMPTY BAGS LEDGER (RIGHT) */}
        <div className="card" style={{ margin: 0, borderTop: '4px solid #ef4444' }}>
          <div className="card-hdr" style={{ padding: '0.5rem 0.75rem' }}>
            <div className="card-title" style={{ color: '#ef4444', fontSize: '0.9rem' }}>
              <i className="fas fa-truck-ramp-box"></i> Outward Empty Bags Ledger Summary
            </div>
          </div>
          <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ tableLayout: 'auto', width: '100%', minWidth: '780px', fontSize: '0.72rem' }}>
              <thead>
                <tr>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', textAlign: 'center', width: '30px' }}>SL</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', width: '140px' }}>Variety Name</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', width: '110px' }}>Party</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', textAlign: 'center', width: '55px' }}>Op. Bags</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', textAlign: 'right', width: '60px' }}>Rate</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', textAlign: 'right', width: '70px' }}>p/b cost</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', textAlign: 'right', width: '75px' }}>LF Total</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', textAlign: 'center', width: '55px' }}>Out. Bags</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', textAlign: 'center', width: '65px' }}>Rem. Bags</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', textAlign: 'right', width: '90px' }}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" style={{ textAlign: 'center', padding: '1rem' }}>Loading outward ledger...</td></tr>
                ) : (
                  outwardRows.map((row, idx) => (
                    <tr key={row.variety_id || idx}>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.25rem' }}>
                        <button 
                          onClick={() => setSelectedVarietyId(row.variety_id)} 
                          style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '0.72rem', textAlign: 'left' }}
                          title="Click to view detailed itemized transaction history"
                        >
                          <i className="fas fa-up-right-from-square" style={{ fontSize: '0.58rem', marginRight: '3px' }}></i>
                          {row.variety_name} ({row.kgs_per_bag} kg)
                        </button>
                      </td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.25rem' }}>
                        <button
                          onClick={() => setSelectedVarietyId(row.variety_id)}
                          style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, textDecoration: 'none', cursor: 'pointer', padding: 0, fontSize: '0.72rem', textAlign: 'left' }}
                          title="Click to view transaction details"
                        >
                          {row.latest_party}
                        </button>
                      </td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'center' }}>{row.opening_bags}</td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'right', fontWeight: 600 }}>₹{row.rate_per_bag}</td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>₹{row.rate_per_bag}</td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'right' }}>{row.lf_total > 0 ? formatINR(row.lf_total) : '-'}</td>
                      <td className="text-rose" style={{ padding: '0.35rem 0.25rem', fontWeight: 700, textAlign: 'center' }}>- {row.outward_bags}</td>
                      <td className="text-blue" style={{ padding: '0.35rem 0.25rem', fontSize: '0.76rem', fontWeight: 800, textAlign: 'center' }}>{row.closing_bags}</td>
                      <td style={{ padding: '0.35rem 0.25rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatINR(row.total_value)}</td>
                    </tr>
                  ))
                )}
                {!loading && outwardRows.length === 0 && (
                  <tr><td colSpan="10" style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No outward records.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* VARIETY DETAILED BREAKDOWN MODAL */}
      {selectedVarietyId && (
        <VarietyDetailModal 
          varietyId={selectedVarietyId} 
          onClose={() => setSelectedVarietyId(null)}
          initialFilters={{ start_date: startDate, end_date: endDate, month }}
        />
      )}
    </div>
  );
};

export default EmptyBagsLedger;
