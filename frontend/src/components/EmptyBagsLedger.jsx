import React, { useState, useEffect } from 'react';
import { getVarieties, getLedger, downloadLedgerPdf } from '../api';
import VarietyDetailModal from './VarietyDetailModal';
import { formatINR, formatBags } from '../utils/formatters';

const EmptyBagsLedger = () => {
  const [varieties, setVarieties] = useState([]);
  const [inwardRows, setInwardRows] = useState([]);
  const [outwardRows, setOutwardRows] = useState([]);
  
  const [viewMode, setViewMode] = useState('inward');
  
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

  const isSplit = viewMode === 'split';
  const showInward = isSplit || viewMode === 'inward';
  const showOutward = isSplit || viewMode === 'outward';

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      
      {/* Top Header & Tab Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-book-open" style={{ color: '#2563eb' }}></i> Empty Bags Stock Movement Ledger
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>
            Track opening stock, bag receipts, issues, and live valuation by variety.
          </p>
        </div>

        {/* Segmented Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="master-tabs-bar" style={{ margin: 0, padding: '4px' }}>
            <button 
              className={`master-tab-btn ${viewMode === 'inward' ? 'active' : ''}`}
              onClick={() => setViewMode('inward')}
              style={{ padding: '0.5rem 1rem' }}
            >
              <i className="fas fa-boxes-packing" style={{ color: viewMode === 'inward' ? '#059669' : '#64748b' }}></i>
              <span>Inward Ledger</span>
              <span className="tab-badge" style={{ background: viewMode === 'inward' ? '#ecfdf5' : '#f1f5f9', color: viewMode === 'inward' ? '#059669' : '#64748b' }}>
                {inwardRows.length}
              </span>
            </button>

            <button 
              className={`master-tab-btn ${viewMode === 'outward' ? 'active' : ''}`}
              onClick={() => setViewMode('outward')}
              style={{ padding: '0.5rem 1rem' }}
            >
              <i className="fas fa-truck-ramp-box" style={{ color: viewMode === 'outward' ? '#dc2626' : '#64748b' }}></i>
              <span>Outward Ledger</span>
              <span className="tab-badge" style={{ background: viewMode === 'outward' ? '#fef2f2' : '#f1f5f9', color: viewMode === 'outward' ? '#dc2626' : '#64748b' }}>
                {outwardRows.length}
              </span>
            </button>

            <button 
              className={`master-tab-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              style={{ padding: '0.5rem 0.9rem' }}
              title="Side by Side Split View"
            >
              <i className="fas fa-columns" style={{ color: viewMode === 'split' ? '#2563eb' : '#64748b' }}></i>
              <span>Split View</span>
            </button>
          </div>

          <button className="btn btn-green" onClick={handleDownloadPdf}>
            <i className="fas fa-file-pdf"></i> Download PDF
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS CARD */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.85rem' }}>
          {/* Invoice No Search */}
          <div className="form-group" style={{ minWidth: '130px', flex: 1 }}>
            <label>Invoice No</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Search Invoice..."
              value={invoiceNo} 
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          {/* Month Picker */}
          <div className="form-group" style={{ minWidth: '130px', flex: 1 }}>
            <label>Month</label>
            <input 
              type="month" 
              className="input" 
              value={month} 
              onChange={(e) => { setMonth(e.target.value); setStartDate(''); setEndDate(''); }}
            />
          </div>

          {/* Date Range Start */}
          <div className="form-group" style={{ minWidth: '130px', flex: 1 }}>
            <label>Start Date</label>
            <input 
              type="date" 
              className="input" 
              value={startDate} 
              onChange={(e) => { setStartDate(e.target.value); setMonth(''); }}
            />
          </div>

          {/* Date Range End */}
          <div className="form-group" style={{ minWidth: '130px', flex: 1 }}>
            <label>End Date</label>
            <input 
              type="date" 
              className="input" 
              value={endDate} 
              onChange={(e) => { setEndDate(e.target.value); setMonth(''); }}
            />
          </div>

          {/* Variety Filter */}
          <div className="form-group" style={{ minWidth: '170px', flex: 1.5 }}>
            <label>Filter Variety</label>
            <select 
              className="input" 
              value={varietyId} 
              onChange={(e) => setVarietyId(e.target.value)}
            >
              <option value="">All Varieties</option>
              {varieties.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.kgs_per_bag} kg)</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="btn btn-blue" onClick={handleApplyFilter}>
              <i className="fas fa-search"></i> Apply
            </button>
            <button className="btn btn-ghost" onClick={handleClearFilter}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* REGISTERS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: isSplit ? '1fr 1fr' : '1fr', gap: '1.25rem', marginBottom: '1.25rem', width: '100%' }}>
        
        {/* INWARD EMPTY BAGS LEDGER */}
        {showInward && (
          <div className="card" style={{ margin: 0, borderTop: '4px solid #10b981', padding: isSplit ? '0.85rem' : '1.15rem' }}>
            <div className="card-hdr" style={{ paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <div className="card-title" style={{ color: '#059669', fontSize: isSplit ? '0.88rem' : '0.95rem' }}>
                <i className="fas fa-boxes-packing"></i> Inward Empty Bags Ledger
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.15rem 0.5rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                {inwardRows.length} Varieties
              </span>
            </div>
            <div className="tbl-wrap">
              <table style={{ fontSize: isSplit ? '0.72rem' : '0.8rem', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: isSplit ? '24px' : '35px', padding: isSplit ? '4px 2px' : '6px 8px' }}>SL</th>
                    <th style={{ padding: isSplit ? '4px 4px' : '6px 8px' }}>{isSplit ? 'Variety' : 'Variety Name'}</th>
                    <th style={{ padding: isSplit ? '4px 4px' : '6px 8px' }}>{isSplit ? 'Party' : 'Party / Supplier'}</th>
                    <th style={{ textAlign: 'center', padding: isSplit ? '4px 2px' : '6px 8px' }}>Op.</th>
                    <th style={{ textAlign: 'right', padding: isSplit ? '4px 3px' : '6px 8px' }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: isSplit ? '4px 3px' : '6px 8px' }}>{isSplit ? 'P/B' : 'P/B Cost'}</th>
                    <th style={{ textAlign: 'right', padding: isSplit ? '4px 3px' : '6px 8px' }}>LF</th>
                    <th style={{ textAlign: 'center', padding: isSplit ? '4px 3px' : '6px 8px' }}>{isSplit ? 'In' : 'Inward Bags'}</th>
                    <th style={{ textAlign: 'center', padding: isSplit ? '4px 3px' : '6px 8px' }}>{isSplit ? 'Rem' : 'Remaining'}</th>
                    <th style={{ textAlign: 'right', padding: isSplit ? '4px 4px' : '6px 8px' }}>{isSplit ? 'Total' : 'Total Value'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading inward ledger...</td></tr>
                  ) : (
                    inwardRows.map((row, idx) => (
                      <tr key={row.variety_id || idx}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', padding: isSplit ? '4px 2px' : '6px 8px' }}>{idx + 1}</td>
                        <td className="wrap-text" style={{ padding: isSplit ? '4px 4px' : '6px 8px', maxWidth: isSplit ? '100px' : '180px' }}>
                          <button 
                            onClick={() => setSelectedVarietyId(row.variety_id)} 
                            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: isSplit ? '0.72rem' : '0.8rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="Click to view itemized history"
                          >
                            <i className="fas fa-up-right-from-square" style={{ fontSize: '0.6rem' }}></i>
                            {row.variety_name} {row.kgs_per_bag ? `(${row.kgs_per_bag}k)` : ''}
                          </button>
                        </td>
                        <td className="wrap-text" style={{ color: '#334155', fontWeight: 600, padding: isSplit ? '4px 4px' : '6px 8px', maxWidth: isSplit ? '85px' : '150px' }}>
                          {row.latest_party || '-'}
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600, padding: isSplit ? '4px 2px' : '6px 8px' }}>{formatBags(row.opening_bags)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, padding: isSplit ? '4px 3px' : '6px 8px' }}>₹{row.rate_per_bag}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb', padding: isSplit ? '4px 3px' : '6px 8px' }}>₹{row.rate_per_bag}</td>
                        <td style={{ textAlign: 'right', color: '#64748b', padding: isSplit ? '4px 3px' : '6px 8px' }}>{row.lf_total > 0 ? formatINR(row.lf_total) : '-'}</td>
                        <td style={{ fontWeight: 800, textAlign: 'center', color: '#059669', padding: isSplit ? '4px 3px' : '6px 8px' }}>+{formatBags(row.inward_bags)}</td>
                        <td style={{ fontWeight: 800, textAlign: 'center', color: '#1d4ed8', padding: isSplit ? '4px 3px' : '6px 8px' }}>{formatBags(row.closing_bags)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', padding: isSplit ? '4px 4px' : '6px 8px' }}>{formatINR(row.total_value)}</td>
                      </tr>
                    ))
                  )}
                  {!loading && inwardRows.length === 0 && (
                    <tr><td colSpan="10" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No inward records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OUTWARD EMPTY BAGS LEDGER */}
        {showOutward && (
          <div className="card" style={{ margin: 0, borderTop: '4px solid #ef4444', padding: isSplit ? '0.85rem' : '1.15rem' }}>
            <div className="card-hdr" style={{ paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <div className="card-title" style={{ color: '#dc2626', fontSize: isSplit ? '0.88rem' : '0.95rem' }}>
                <i className="fas fa-truck-ramp-box"></i> Outward Empty Bags Ledger
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '0.15rem 0.5rem', borderRadius: '6px', border: '1px solid #fecaca' }}>
                {outwardRows.length} Varieties
              </span>
            </div>
            <div className="tbl-wrap">
              <table style={{ fontSize: isSplit ? '0.72rem' : '0.8rem', width: '100%' }}>
                <thead>
                  <tr>
                    <th className="outward-th" style={{ textAlign: 'center', width: isSplit ? '24px' : '35px', padding: isSplit ? '4px 2px' : '6px 8px' }}>SL</th>
                    <th className="outward-th" style={{ padding: isSplit ? '4px 4px' : '6px 8px' }}>{isSplit ? 'Variety' : 'Variety Name'}</th>
                    <th className="outward-th" style={{ padding: isSplit ? '4px 4px' : '6px 8px' }}>{isSplit ? 'Party' : 'Customer / Party'}</th>
                    <th className="outward-th" style={{ textAlign: 'center', padding: isSplit ? '4px 2px' : '6px 8px' }}>Op.</th>
                    <th className="outward-th" style={{ textAlign: 'right', padding: isSplit ? '4px 3px' : '6px 8px' }}>Rate</th>
                    <th className="outward-th" style={{ textAlign: 'right', padding: isSplit ? '4px 3px' : '6px 8px' }}>{isSplit ? 'P/B' : 'P/B Cost'}</th>
                    <th className="outward-th" style={{ textAlign: 'right', padding: isSplit ? '4px 3px' : '6px 8px' }}>LF</th>
                    <th className="outward-th" style={{ textAlign: 'center', padding: isSplit ? '4px 3px' : '6px 8px' }}>{isSplit ? 'Out' : 'Outward Bags'}</th>
                    <th className="outward-th" style={{ textAlign: 'center', padding: isSplit ? '4px 3px' : '6px 8px' }}>{isSplit ? 'Rem' : 'Remaining'}</th>
                    <th className="outward-th" style={{ textAlign: 'right', padding: isSplit ? '4px 4px' : '6px 8px' }}>{isSplit ? 'Total' : 'Total Value'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading outward ledger...</td></tr>
                  ) : (
                    outwardRows.map((row, idx) => (
                      <tr key={row.variety_id || idx}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', padding: isSplit ? '4px 2px' : '6px 8px' }}>{idx + 1}</td>
                        <td className="wrap-text" style={{ padding: isSplit ? '4px 4px' : '6px 8px', maxWidth: isSplit ? '100px' : '180px' }}>
                          <button 
                            onClick={() => setSelectedVarietyId(row.variety_id)} 
                            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: isSplit ? '0.72rem' : '0.8rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Click to view itemized history"
                          >
                            <i className="fas fa-up-right-from-square" style={{ fontSize: '0.6rem' }}></i>
                            {row.variety_name} {row.kgs_per_bag ? `(${row.kgs_per_bag}k)` : ''}
                          </button>
                        </td>
                        <td className="wrap-text" style={{ color: '#334155', fontWeight: 600, padding: isSplit ? '4px 4px' : '6px 8px', maxWidth: isSplit ? '85px' : '150px' }}>
                          {row.latest_party || '-'}
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600, padding: isSplit ? '4px 2px' : '6px 8px' }}>{formatBags(row.opening_bags)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, padding: isSplit ? '4px 3px' : '6px 8px' }}>₹{row.rate_per_bag}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb', padding: isSplit ? '4px 3px' : '6px 8px' }}>₹{row.rate_per_bag}</td>
                        <td style={{ textAlign: 'right', color: '#64748b', padding: isSplit ? '4px 3px' : '6px 8px' }}>{row.lf_total > 0 ? formatINR(row.lf_total) : '-'}</td>
                        <td style={{ fontWeight: 800, textAlign: 'center', color: '#dc2626', padding: isSplit ? '4px 3px' : '6px 8px' }}>-{formatBags(row.outward_bags)}</td>
                        <td style={{ fontWeight: 800, textAlign: 'center', color: '#1d4ed8', padding: isSplit ? '4px 3px' : '6px 8px' }}>{formatBags(row.closing_bags)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', padding: isSplit ? '4px 4px' : '6px 8px' }}>{formatINR(row.total_value)}</td>
                      </tr>
                    ))
                  )}
                  {!loading && outwardRows.length === 0 && (
                    <tr><td colSpan="10" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No outward records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
