import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getVarieties, getLedger, downloadLedgerPdf } from '../api';
import VarietyDetailModal from './VarietyDetailModal';
import SearchableSelect from './SearchableSelect';
import { formatINR, formatBags } from '../utils/formatters';

const EmptyBagsLedger = () => {
  const [varieties, setVarieties] = useState([]);
  const [inwardRows, setInwardRows] = useState([]);
  const [outwardRows, setOutwardRows] = useState([]);
  
  // viewMode: 'split' | 'inward' | 'outward' | 'cards'
  const [viewMode, setViewMode] = useState('split');
  
  const [varietyId, setVarietyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [selectedVarietyId, setSelectedVarietyId] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    fetchVarieties();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLedger();
    }, 150);
    return () => clearTimeout(timer);
  }, [varietyId, invoiceNo, month, startDate, endDate]);

  const fetchVarieties = async () => {
    try {
      const res = await getVarieties();
      setVarieties(res.results || res.data || res);
    } catch (err) {
      console.error(err);
    }
  };

  const requestSeqRef = React.useRef(0);

  const fetchLedger = async () => {
    const currentSeq = ++requestSeqRef.current;
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
      if (currentSeq === requestSeqRef.current) {
        setInwardRows(res.inwards || []);
        setOutwardRows(res.outwards || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (currentSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  };

  // O(1) Instant memoized variety map for ultra-low latency photo lookups (<1ms)
  const varietyMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(varieties)) {
      varieties.forEach(v => map.set(v.id, v));
    }
    return map;
  }, [varieties]);

  const getPhotoInfo = (row) => {
    const v = varietyMap.get(row.variety_id);
    const src = row.photo_url || row.photo_data || v?.photo_url || v?.photo_data || (v?.photo ? (typeof v.photo === 'string' && v.photo.startsWith('http') ? v.photo : `${window.location.origin}${v.photo}`) : null);
    return {
      src: src || null,
      name: row.variety_name || v?.name || 'Variety Bag',
      kgs: row.kgs_per_bag || v?.kgs_per_bag
    };
  };

  const hasActiveFilters = Boolean(varietyId || startDate || endDate || month || invoiceNo);

  const handleClearFilter = () => {
    setVarietyId('');
    setStartDate('');
    setEndDate('');
    setMonth('');
    setInvoiceNo('');
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
    if (viewMode === 'inward') params.type = 'inward';
    else if (viewMode === 'outward') params.type = 'outward';
    downloadLedgerPdf(params);
  };

  const isSplit = viewMode === 'split';
  const isCards = viewMode === 'cards';
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
              className={`master-tab-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              style={{ padding: '0.5rem 0.95rem' }}
              title="Left: Inward with Images | Right: Outward with Images"
            >
              <i className="fas fa-columns" style={{ color: viewMode === 'split' ? '#2563eb' : '#64748b' }}></i>
              <span>Split View</span>
            </button>

            <button 
              className={`master-tab-btn ${viewMode === 'inward' ? 'active' : ''}`}
              onClick={() => setViewMode('inward')}
              style={{ padding: '0.5rem 0.95rem' }}
            >
              <i className="fas fa-boxes-packing" style={{ color: viewMode === 'inward' ? '#059669' : '#64748b' }}></i>
              <span>Inward Only</span>
              <span className="tab-badge" style={{ background: viewMode === 'inward' ? '#ecfdf5' : '#f1f5f9', color: viewMode === 'inward' ? '#059669' : '#64748b' }}>
                {inwardRows.length}
              </span>
            </button>

            <button 
              className={`master-tab-btn ${viewMode === 'outward' ? 'active' : ''}`}
              onClick={() => setViewMode('outward')}
              style={{ padding: '0.5rem 0.95rem' }}
            >
              <i className="fas fa-truck-ramp-box" style={{ color: viewMode === 'outward' ? '#dc2626' : '#64748b' }}></i>
              <span>Outward Only</span>
              <span className="tab-badge" style={{ background: viewMode === 'outward' ? '#fef2f2' : '#f1f5f9', color: viewMode === 'outward' ? '#dc2626' : '#64748b' }}>
                {outwardRows.length}
              </span>
            </button>

            <button 
              className={`master-tab-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              style={{ padding: '0.5rem 0.95rem' }}
              title="Visual Product Stock Cards"
            >
              <i className="fas fa-grip" style={{ color: viewMode === 'cards' ? '#d97706' : '#64748b' }}></i>
              <span>Visual Cards</span>
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

          {/* Variety Filter with Live Search */}
          <div className="form-group" style={{ minWidth: '180px', flex: 1.5 }}>
            <label>Filter Variety</label>
            <SearchableSelect 
              options={[{ id: '', name: 'All Varieties' }, ...varieties.map(v => ({ id: v.id, name: `${v.name} (${v.kgs_per_bag} kg)` }))]}
              value={varietyId}
              onChange={setVarietyId}
              placeholder="All Varieties"
            />
          </div>

          {/* Action Button: Clear Filter (only shown if filters active) */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn btn-ghost" onClick={handleClearFilter} style={{ padding: '0.5rem 0.85rem' }}>
                <i className="fas fa-times" style={{ marginRight: '4px' }}></i> Clear Filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── VISUAL CARDS GRID MODE ─── */}
      {isCards ? (
        <div>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
              <div>Loading stock cards...</div>
            </div>
          ) : (
            <div className="ledger-cards-grid">
              {inwardRows.map((row) => {
                const photoInfo = getPhotoInfo(row);
                const outRow = outwardRows.find(o => o.variety_id === row.variety_id) || {};
                const outBags = outRow.outward_bags || 0;
                const closingBags = (row.opening_bags || 0) + (row.inward_bags || 0) - outBags;

                return (
                  <article key={row.variety_id} className="ledger-stock-card">
                    <div 
                      className="ledger-card-photo-wrap"
                      onClick={() => photoInfo.src && setPreviewPhoto(photoInfo)}
                      title={photoInfo.src ? "Click to view full photo" : "No photo uploaded"}
                    >
                      {photoInfo.src ? (
                        <img src={photoInfo.src} alt={photoInfo.name} />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                          <i className="fas fa-image" style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}></i>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>No Photo</div>
                        </div>
                      )}
                      <span className="ledger-card-badge">
                        ⚖️ {row.kgs_per_bag || 0} kg/bag
                      </span>
                    </div>

                    <div className="ledger-card-body">
                      <div>
                        <button
                          onClick={() => setSelectedVarietyId(row.variety_id)}
                          style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          title="Click to view full transaction ledger"
                        >
                          <h3 className="ledger-card-title" style={{ color: '#2563eb' }}>
                            {row.variety_name}
                          </h3>
                          <i className="fas fa-up-right-from-square" style={{ fontSize: '0.7rem', color: '#2563eb' }}></i>
                        </button>
                        {row.latest_party && row.latest_party !== '-' && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                            Supplier: <strong>{row.latest_party}</strong>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div className="ledger-card-meta-row">
                          <span style={{ color: '#64748b' }}>Opening Stock:</span>
                          <strong style={{ color: '#334155' }}>{formatBags(row.opening_bags)}</strong>
                        </div>
                        <div className="ledger-card-meta-row">
                          <span style={{ color: '#059669', fontWeight: 600 }}>Inward (+):</span>
                          <strong style={{ color: '#059669' }}>+{formatBags(row.inward_bags)}</strong>
                        </div>
                        <div className="ledger-card-meta-row">
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>Outward (-):</span>
                          <strong style={{ color: '#dc2626' }}>-{formatBags(outBags)}</strong>
                        </div>
                        <div className="ledger-card-meta-row" style={{ background: '#f8fafc', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#1d4ed8', fontWeight: 700 }}>Remaining:</span>
                          <strong style={{ color: '#1d4ed8', fontSize: '0.95rem' }}>{formatBags(closingBags)} bags</strong>
                        </div>
                        <div className="ledger-card-meta-row">
                          <span style={{ color: '#64748b' }}>Avg Rate:</span>
                          <strong style={{ color: '#0f172a' }}>₹{row.rate_per_bag}</strong>
                        </div>
                        <div className="ledger-card-meta-row">
                          <span style={{ color: '#64748b' }}>Total Value:</span>
                          <strong style={{ color: '#0f172a' }}>{formatINR(row.total_value)}</strong>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── SPLIT & TABLE VIEW (LEFT: INWARD with Images | RIGHT: OUTWARD with Images) ─── */
        <div style={{ display: 'grid', gridTemplateColumns: isSplit ? '1fr 1fr' : '1fr', gap: '1.25rem', marginBottom: '1.25rem', width: '100%' }}>
          
          {/* LEFT SIDE: INWARD EMPTY BAGS LEDGER */}
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
                      <th style={{ textAlign: 'center', width: isSplit ? '22px' : '30px', padding: isSplit ? '4px 2px' : '6px 6px' }}>SL</th>
                      <th style={{ textAlign: 'center', width: isSplit ? '36px' : '44px', padding: isSplit ? '4px 2px' : '6px 4px' }}>Photo</th>
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
                      <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading inward ledger...</td></tr>
                    ) : (
                      inwardRows.map((row, idx) => {
                        const photoInfo = getPhotoInfo(row);
                        return (
                          <tr key={row.variety_id || idx}>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', padding: isSplit ? '4px 2px' : '6px 6px' }}>{idx + 1}</td>
                            
                            {/* BAG IMAGE THUMBNAIL (CLICK TO ZOOM) */}
                            <td style={{ textAlign: 'center', padding: isSplit ? '4px 2px' : '6px 4px' }}>
                              {photoInfo.src ? (
                                <button 
                                  className="ledger-photo-btn"
                                  onClick={() => setPreviewPhoto(photoInfo)}
                                  title="Click to view full photo"
                                >
                                  <img 
                                    src={photoInfo.src} 
                                    alt={photoInfo.name} 
                                    className="ledger-photo-thumb"
                                  />
                                </button>
                              ) : (
                                <div className="ledger-no-photo-thumb" title="No photo uploaded">
                                  <i className="fas fa-image"></i>
                                </div>
                              )}
                            </td>

                            <td className="wrap-text" style={{ padding: isSplit ? '4px 4px' : '6px 8px', maxWidth: isSplit ? '95px' : '170px' }}>
                              <button 
                                onClick={() => setSelectedVarietyId(row.variety_id)} 
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: isSplit ? '0.72rem' : '0.8rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '3px' }}
                                title="Click to view itemized history"
                              >
                                <i className="fas fa-up-right-from-square" style={{ fontSize: '0.6rem' }}></i>
                                {row.variety_name} {row.kgs_per_bag ? `(${row.kgs_per_bag}k)` : ''}
                              </button>
                            </td>
                            <td className="wrap-text" style={{ color: '#334155', fontWeight: 600, padding: isSplit ? '4px 4px' : '6px 8px', maxWidth: isSplit ? '80px' : '140px' }}>
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
                        );
                      })
                    )}
                    {!loading && inwardRows.length === 0 && (
                      <tr><td colSpan="11" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No inward records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RIGHT SIDE: OUTWARD EMPTY BAGS LEDGER */}
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
                      <th className="outward-th" style={{ textAlign: 'center', width: isSplit ? '22px' : '30px', padding: isSplit ? '4px 2px' : '6px 6px' }}>SL</th>
                      <th className="outward-th" style={{ textAlign: 'center', width: isSplit ? '36px' : '44px', padding: isSplit ? '4px 2px' : '6px 4px' }}>Photo</th>
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
                      <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading outward ledger...</td></tr>
                    ) : (
                      outwardRows.map((row, idx) => {
                        const photoInfo = getPhotoInfo(row);
                        return (
                          <tr key={row.variety_id || idx}>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', padding: isSplit ? '4px 2px' : '6px 6px' }}>{idx + 1}</td>

                            {/* BAG IMAGE THUMBNAIL (CLICK TO ZOOM) */}
                            <td style={{ textAlign: 'center', padding: isSplit ? '4px 2px' : '6px 4px' }}>
                              {photoInfo.src ? (
                                <button 
                                  className="ledger-photo-btn"
                                  onClick={() => setPreviewPhoto(photoInfo)}
                                  title="Click to view full photo"
                                >
                                  <img 
                                    src={photoInfo.src} 
                                    alt={photoInfo.name} 
                                    className="ledger-photo-thumb"
                                  />
                                </button>
                              ) : (
                                <div className="ledger-no-photo-thumb" title="No photo uploaded">
                                  <i className="fas fa-image"></i>
                                </div>
                              )}
                            </td>

                            <td className="wrap-text" style={{ padding: isSplit ? '4px 4px' : '6px 8px', maxWidth: isSplit ? '95px' : '170px' }}>
                              <button 
                                onClick={() => setSelectedVarietyId(row.variety_id)} 
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: isSplit ? '0.72rem' : '0.8rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Click to view itemized history"
                              >
                                <i className="fas fa-up-right-from-square" style={{ fontSize: '0.6rem' }}></i>
                                {row.variety_name} {row.kgs_per_bag ? `(${row.kgs_per_bag}k)` : ''}
                              </button>
                            </td>
                            <td className="wrap-text" style={{ color: '#334155', fontWeight: 600, padding: isSplit ? '4px 4px' : '6px 8px', maxWidth: isSplit ? '80px' : '140px' }}>
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
                        );
                      })
                    )}
                    {!loading && outwardRows.length === 0 && (
                      <tr><td colSpan="11" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No outward records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VARIETY DETAILED BREAKDOWN MODAL */}
      {selectedVarietyId && (
        <VarietyDetailModal 
          varietyId={selectedVarietyId} 
          onClose={() => setSelectedVarietyId(null)}
          initialFilters={{ start_date: startDate, end_date: endDate, month }}
        />
      )}

      {/* FULL-SIZE PHOTO PREVIEW LIGHTBOX */}
      {previewPhoto && (
        <div 
          className="modal-overlay" 
          onClick={() => setPreviewPhoto(null)} 
          style={{ zIndex: 99999, background: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div 
            className="modal" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '520px', width: '92%', padding: '1.25rem', borderRadius: '14px', background: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <i className="fas fa-image" style={{ color: '#2563eb' }}></i> {previewPhoto.name}
                </h3>
                {previewPhoto.kgs && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    Standard Weight: {previewPhoto.kgs} kg/bag
                  </span>
                )}
              </div>
              <button 
                className="modal-close" 
                onClick={() => setPreviewPhoto(null)}
                style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ textAlign: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <img 
                src={previewPhoto.src} 
                alt={previewPhoto.name} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '400px', 
                  objectFit: 'contain', 
                  borderRadius: '8px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.5rem' }}>
              <a 
                href={previewPhoto.src} 
                download={`${previewPhoto.name.replace(/\s+/g, '_')}_bag.jpg`} 
                className="btn btn-blue btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
              >
                <i className="fas fa-download"></i> Download Photo
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewPhoto(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmptyBagsLedger;
