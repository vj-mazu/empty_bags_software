import React, { useState, useEffect } from 'react';
import { getVarieties, getLedger } from '../api';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 1
  }).format(num);
};

const EmptyBagsLedger = () => {
  const [varieties, setVarieties] = useState([]);
  const [ledgerData, setLedgerData] = useState([]);
  const [pagination, setPagination] = useState({});
  
  const [varietyId, setVarietyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVarieties();
    fetchLedger(1);
  }, []);

  const fetchVarieties = async () => {
    try {
      const res = await getVarieties();
      setVarieties(res.results || res.data || res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async (page) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: 50
      };
      if (varietyId) params.variety_id = varietyId;
      if (invoiceNo) params.invoice_no = invoiceNo;
      if (month) {
        params.month = month;
      } else {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }
      
      const res = await getLedger(params);
      setLedgerData(res.results || []);
      setPagination(res.pagination || {});
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleApplyFilter = () => {
    fetchLedger(1);
  };

  const handleClearFilter = () => {
    setVarietyId('');
    setStartDate('');
    setEndDate('');
    setMonth('');
    setInvoiceNo('');
    setLoading(true);
    getLedger({ page: 1, page_size: 50 }).then(res => {
      setLedgerData(res.results || []);
      setPagination(res.pagination || {});
      setCurrentPage(1);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleMonthChange = (e) => {
    setMonth(e.target.value);
    setStartDate('');
    setEndDate('');
  };

  const handleDateChange = (setter) => (e) => {
    setter(e.target.value);
    setMonth('');
  };

  const openingBags = ledgerData.length > 0 ? ledgerData[0].opening_bags : 0;
  const openingKgs = ledgerData.length > 0 ? ledgerData[0].opening_kgs : 0;
  const closingBags = ledgerData.length > 0 ? ledgerData[ledgerData.length - 1].closing_bags : 0;
  const closingKgs = ledgerData.length > 0 ? ledgerData[ledgerData.length - 1].closing_kgs : 0;

  const inwards = ledgerData.filter(row => row.inward_bags > 0);
  const outwards = ledgerData.filter(row => row.outward_bags > 0);

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '0 1.5rem' }}>
      <div className="card-hdr" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ fontSize: '1.2rem' }}>
          <i className="fas fa-book-open" style={{ color: '#2563eb' }}></i> Empty Bags Movement Ledger
        </h2>
      </div>

      {/* FILTERS BAR */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="filters" style={{ margin: 0 }}>
          <div className="filter-group">
            <label>Variety</label>
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

          <div className="filter-group">
            <label>Invoice No (Case-Sensitive)</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. MI-IN-20260723-0001"
              value={invoiceNo} 
              onChange={(e) => setInvoiceNo(e.target.value)}
              style={{ width: '190px' }}
            />
          </div>
          
          <div className="filter-group">
            <label>Month (Shortcut)</label>
            <input 
              type="month" 
              className="input" 
              value={month} 
              onChange={handleMonthChange}
            />
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input 
              type="date" 
              className="input" 
              value={startDate} 
              onChange={handleDateChange(setStartDate)}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input 
              type="date" 
              className="input" 
              value={endDate} 
              onChange={handleDateChange(setEndDate)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-blue" onClick={handleApplyFilter} disabled={loading}>
              <i className="fas fa-filter"></i> Apply Filters
            </button>
            <button className="btn btn-ghost" onClick={handleClearFilter} disabled={loading}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* LEDGER OPENING STOCK SUMMARY (At Top) */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
          <i className="fas fa-boxes" style={{ color: '#2563eb', fontSize: '1.15rem' }}></i>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Opening Stock Balance</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a8a' }}>
              {openingBags.toLocaleString()} Bags / {Number(openingKgs).toFixed(2)} Kgs
            </div>
          </div>
        </div>
      </div>

      {/* REGISTERS GRID (Side-By-Side Layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        
        {/* INWARD MOVEMENTS */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-hdr" style={{ padding: '0.5rem 0.75rem' }}>
            <div className="card-title" style={{ color: '#10b981', fontSize: '0.9rem' }}>
              <i className="fas fa-boxes-packing"></i> Inward Empty Bags Ledger
            </div>
          </div>
          <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ tableLayout: 'auto', width: '100%', fontSize: '0.72rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Variety</th>
                  <th style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Party</th>
                  <th style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Date</th>
                  <th style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Op.<br/>Bags</th>
                  <th className="mobile-hide" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Op.<br/>Kgs</th>
                  <th className="mobile-hide" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>LF</th>
                  <th style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>In.<br/>Bags</th>
                  <th className="mobile-hide" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>In.<br/>Kgs</th>
                  <th style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Cl.<br/>Bags</th>
                  <th className="mobile-hide" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Cl.<br/>Kgs</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" style={{ textAlign: 'center', padding: '1rem' }}>Loading...</td></tr>
                ) : (
                  inwards.map((row, idx) => (
                    <tr key={idx}>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.2rem', fontWeight: 700 }}>{row.variety_name}</td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.2rem' }}>{row.party_name}</td>
                      <td style={{ padding: '0.35rem 0.2rem', whiteSpace: 'nowrap' }}>{row.date}</td>
                      <td style={{ padding: '0.35rem 0.2rem', textAlign: 'center' }}>{row.opening_bags}</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.2rem', textAlign: 'right' }}>{Number(row.opening_kgs).toFixed(1)} kg</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.2rem', textAlign: 'center' }}>{row.lf_toggle ? formatINR(row.lf_amount) : '-'}</td>
                      <td className="text-green" style={{ padding: '0.35rem 0.2rem', fontWeight: 700, textAlign: 'center' }}>+ {row.inward_bags}</td>
                      <td className="mobile-hide text-green" style={{ padding: '0.35rem 0.2rem', textAlign: 'right' }}>+ {Number(row.inward_kgs).toFixed(1)} kg</td>
                      <td className="text-blue" style={{ padding: '0.35rem 0.2rem', fontSize: '0.78rem', fontWeight: 800, textAlign: 'center' }}>{row.closing_bags}</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.2rem', fontWeight: 700, textAlign: 'right' }}>{Number(row.closing_kgs).toFixed(1)} kg</td>
                    </tr>
                  ))
                )}
                {!loading && inwards.length === 0 && (
                  <tr><td colSpan="10" style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No inward movements.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OUTWARD MOVEMENTS */}
        <div className="card" style={{ margin: 0, borderTop: '4px solid #ef4444' }}>
          <div className="card-hdr" style={{ padding: '0.5rem 0.75rem' }}>
            <div className="card-title" style={{ color: '#2563eb', fontSize: '0.9rem' }}>
              <i className="fas fa-truck-ramp-box" style={{ color: '#2563eb' }}></i> Outward Empty Bags Ledger
            </div>
          </div>
          <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ tableLayout: 'auto', width: '100%', fontSize: '0.72rem' }}>
              <thead>
                <tr>
                  <th className="outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Variety</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Party</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Date</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Op.<br/>Bags</th>
                  <th className="mobile-hide outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Op.<br/>Kgs</th>
                  <th className="mobile-hide outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>LF</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Out.<br/>Bags</th>
                  <th className="mobile-hide outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Out.<br/>Kgs</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Cl.<br/>Bags</th>
                  <th className="mobile-hide outward-th" style={{ padding: '0.35rem 0.2rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center' }}>Cl.<br/>Kgs</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" style={{ textAlign: 'center', padding: '1rem' }}>Loading...</td></tr>
                ) : (
                  outwards.map((row, idx) => (
                    <tr key={idx}>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.2rem', fontWeight: 700 }}>{row.variety_name}</td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.2rem' }}>{row.party_name}</td>
                      <td style={{ padding: '0.35rem 0.2rem', whiteSpace: 'nowrap' }}>{row.date}</td>
                      <td style={{ padding: '0.35rem 0.2rem', textAlign: 'center' }}>{row.opening_bags}</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.2rem', textAlign: 'right' }}>{Number(row.opening_kgs).toFixed(1)} kg</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.2rem', textAlign: 'center' }}>{row.lf_toggle ? formatINR(row.lf_amount) : '-'}</td>
                      <td className="text-rose" style={{ padding: '0.35rem 0.2rem', fontWeight: 700, textAlign: 'center' }}>- {row.outward_bags}</td>
                      <td className="mobile-hide text-rose" style={{ padding: '0.35rem 0.2rem', textAlign: 'right' }}>- {Number(row.outward_kgs).toFixed(1)} kg</td>
                      <td className="text-blue" style={{ padding: '0.35rem 0.2rem', fontSize: '0.78rem', fontWeight: 800, textAlign: 'center' }}>{row.closing_bags}</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.2rem', fontWeight: 700, textAlign: 'right' }}>{Number(row.closing_kgs).toFixed(1)} kg</td>
                    </tr>
                  ))
                )}
                {!loading && outwards.length === 0 && (
                  <tr><td colSpan="10" style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No outward movements.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* PAGINATION CONTROLS */}
      {pagination.total_pages > 1 && (
        <div className="pagination">
          <div>
            Showing {((currentPage - 1) * pagination.page_size) + 1} to {Math.min(currentPage * pagination.page_size, pagination.total_count)} of {pagination.total_count} records
          </div>
          <div className="page-btns">
            <button 
              className="page-btn" 
              disabled={!pagination.has_previous || loading}
              onClick={() => fetchLedger(currentPage - 1)}
            >
              <i className="fas fa-chevron-left"></i> Prev
            </button>
            
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(p => (
              <button 
                key={p} 
                className={`page-btn ${p === currentPage ? 'active' : ''}`}
                onClick={() => fetchLedger(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}

            <button 
              className="page-btn" 
              disabled={!pagination.has_next || loading}
              onClick={() => fetchLedger(currentPage + 1)}
            >
              Next <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmptyBagsLedger;
