import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getVarieties, getLedger, downloadLedgerPdf } from '../api';
import VarietyDetailModal from './VarietyDetailModal';
import SearchableSelect from './SearchableSelect';
import { formatINR, formatBags } from '../utils/formatters';

const LedgerStockCard = ({ row, type, index, onSelectVariety, onPreviewPhoto, getPhotoInfo }) => {
  const photoInfo = getPhotoInfo(row);
  const bagIdx = String(index + 1).padStart(2, '0');
  const isInward = type === 'inward';

  return (
    <article 
      className="ledger-stock-card"
      onClick={() => onSelectVariety(row.variety_id)}
      style={{ cursor: 'pointer' }}
    >
      {/* PHOTO HERO CONTAINER */}
      <div 
        className="ledger-card-photo-wrap"
        onClick={(e) => {
          if (photoInfo.src) {
            e.stopPropagation();
            onPreviewPhoto(photoInfo);
          }
        }}
        title="Click to zoom high-resolution photo"
      >
        {photoInfo.src ? (
          <img src={photoInfo.src} alt={photoInfo.name} />
        ) : (
          <div className="ledger-no-photo">
            <i className="fas fa-image"></i>
            <span>No Photo Uploaded</span>
          </div>
        )}
        <span className="ledger-card-badge">{bagIdx}</span>
        <span className="ledger-card-weight-badge">⚖️ {row.kgs_per_bag || 0} kg</span>
      </div>

      {/* CARD CONTENT BODY */}
      <div className="ledger-card-body">
        
        {/* Variety Header Block */}
        <div className="ledger-card-header-block">
          <div className={`ledger-card-kicker ${isInward ? 'kicker-inward' : 'kicker-outward'}`}>
            <i className={isInward ? "fas fa-arrow-circle-down" : "fas fa-arrow-circle-up"}></i>
            <span>{isInward ? 'INWARD RECEIPT' : 'OUTWARD ISSUE'}</span>
          </div>
          <h3 className="ledger-card-title" title={row.variety_name}>
            {row.variety_name}
          </h3>
          <div className="ledger-card-party-tag" title={row.latest_party || ''}>
            <i className={isInward ? "fas fa-truck-ramp-box" : "fas fa-building"}></i>
            <span className="party-label">{isInward ? 'Supplier:' : 'Party / Unit:'}</span>
            <span className="party-name">{row.latest_party && row.latest_party !== '-' ? row.latest_party : 'General Movement'}</span>
          </div>
        </div>

        {/* Structured 2x2 Metric Grid */}
        <div className="ledger-metrics-grid">
          {/* Tile 1: Opening Stock */}
          <div className="ledger-metric-tile">
            <span className="metric-label">Opening Stock</span>
            <span className="metric-value text-slate">{formatBags(row.opening_bags)} <small>bags</small></span>
          </div>

          {/* Tile 2: Movement (+ or -) */}
          <div className={`ledger-metric-tile ${isInward ? 'metric-tile-green' : 'metric-tile-red'}`}>
            <span className="metric-label">{isInward ? 'Inward Bags (+)' : 'Outward Bags (-)'}</span>
            <span className={`metric-value ${isInward ? 'text-green' : 'text-red'}`}>
              {isInward ? `+${formatBags(row.inward_bags)}` : `-${formatBags(row.outward_bags)}`} <small>bags</small>
            </span>
          </div>

          {/* Tile 3: Rate */}
          <div className="ledger-metric-tile">
            <span className="metric-label">{isInward ? 'Purchase Rate' : 'Issue Rate'}</span>
            <span className="metric-value text-slate">{formatINR(row.rate_per_bag)} <small>/bag</small></span>
          </div>

          {/* Tile 4: Movement Valuation */}
          <div className="ledger-metric-tile">
            <span className="metric-label">{isInward ? 'Inward Value' : 'Outward Value'}</span>
            <span className="metric-value text-slate font-mono">{formatINR(row.total_value)}</span>
          </div>
        </div>

        {/* Prominent Current Balance Banner */}
        <div className="ledger-balance-banner">
          <div className="balance-left">
            <i className="fas fa-boxes-stacked"></i>
            <span>Current Balance</span>
          </div>
          <div className="balance-right">
            <strong>{formatBags(row.closing_bags)}</strong> <small>bags</small>
          </div>
        </div>

        {/* Card Footer Link */}
        <div className="ledger-card-footer">
          <span>Click to view itemized history</span>
          <i className="fas fa-arrow-right"></i>
        </div>

      </div>
    </article>
  );
};

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
    let src = row.photo_data || v?.photo_data || row.photo_url || v?.photo_url || v?.photo || null;
    if (src && typeof src === 'string' && !src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('/')) {
      src = `${window.location.origin}/${src}`;
    }
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
              title="Left: Inward Cards | Right: Outward Cards"
            >
              <i className="fas fa-columns" style={{ color: viewMode === 'split' ? '#2563eb' : '#64748b' }}></i>
              <span>Split Cards</span>
            </button>

            <button 
              className={`master-tab-btn ${viewMode === 'inward' ? 'active' : ''}`}
              onClick={() => setViewMode('inward')}
              style={{ padding: '0.5rem 0.95rem' }}
            >
              <i className="fas fa-boxes-packing" style={{ color: viewMode === 'inward' ? '#059669' : '#64748b' }}></i>
              <span>Inward Cards</span>
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
              <span>Outward Cards</span>
              <span className="tab-badge" style={{ background: viewMode === 'outward' ? '#fef2f2' : '#f1f5f9', color: viewMode === 'outward' ? '#dc2626' : '#64748b' }}>
                {outwardRows.length}
              </span>
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

      {/* ─── VISUAL CARDS MODE (SPLIT & SINGLE) ─── */}
      <div>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.8rem', marginBottom: '0.6rem', color: '#2563eb' }}></i>
            <div style={{ fontWeight: 600 }}>Loading variety stock cards...</div>
          </div>
        ) : isSplit ? (
          /* ─── SPLIT VIEW (PAIRED SIDE-BY-SIDE EQUAL HEIGHT ROWS) ─── */
          <div style={{ width: '100%' }}>
            {/* Top Column Headers */}
            <div className="ledger-split-top-header">
              <div className="ledger-col-header col-hdr-inward">
                <div className="col-hdr-title">
                  <i className="fas fa-boxes-packing"></i>
                  <span>INWARD EMPTY BAGS</span>
                </div>
                <span className="col-hdr-count">{inwardRows.length} Varieties</span>
              </div>

              <div className="ledger-col-header col-hdr-outward">
                <div className="col-hdr-title">
                  <i className="fas fa-truck-ramp-box"></i>
                  <span>OUTWARD EMPTY BAGS</span>
                </div>
                <span className="col-hdr-count">{outwardRows.length} Varieties</span>
              </div>
            </div>

            {/* Paired Grid Rows: Left and Right align side-by-side with 100% equal height */}
            <div className="ledger-pairs-container">
              {Array.from({ length: Math.max(inwardRows.length, outwardRows.length) }).map((_, idx) => {
                const inRow = inwardRows[idx];
                const outRow = outwardRows[idx];
                return (
                  <div key={inRow?.variety_id || outRow?.variety_id || idx} className="ledger-pair-row">
                    {inRow ? (
                      <LedgerStockCard 
                        row={inRow} 
                        type="inward" 
                        index={idx}
                        onSelectVariety={setSelectedVarietyId}
                        onPreviewPhoto={setPreviewPhoto}
                        getPhotoInfo={getPhotoInfo}
                      />
                    ) : (
                      <div className="ledger-empty-placeholder">No Inward Record</div>
                    )}

                    {outRow ? (
                      <LedgerStockCard 
                        row={outRow} 
                        type="outward" 
                        index={idx}
                        onSelectVariety={setSelectedVarietyId}
                        onPreviewPhoto={setPreviewPhoto}
                        getPhotoInfo={getPhotoInfo}
                      />
                    ) : (
                      <div className="ledger-empty-placeholder">No Outward Record</div>
                    )}
                  </div>
                );
              })}
              {inwardRows.length === 0 && outwardRows.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  No bag records found matching the current filters.
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'inward' ? (
          /* ─── INWARD SINGLE CARDS VIEW (6 PER ROW) ─── */
          <div style={{ width: '100%' }}>
            <div className="ledger-col-header col-hdr-inward" style={{ marginBottom: '1.25rem' }}>
              <div className="col-hdr-title">
                <i className="fas fa-boxes-packing"></i>
                <span>INWARD EMPTY BAGS</span>
              </div>
              <span className="col-hdr-count">{inwardRows.length} Varieties</span>
            </div>
            <div className="ledger-single-cards-grid">
              {inwardRows.map((row, idx) => (
                <LedgerStockCard 
                  key={row.variety_id || idx}
                  row={row}
                  type="inward"
                  index={idx}
                  onSelectVariety={setSelectedVarietyId}
                  onPreviewPhoto={setPreviewPhoto}
                  getPhotoInfo={getPhotoInfo}
                />
              ))}
            </div>
            {inwardRows.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                No inward records found matching the current filters.
              </div>
            )}
          </div>
        ) : (
          /* ─── OUTWARD SINGLE CARDS VIEW (6 PER ROW) ─── */
          <div style={{ width: '100%' }}>
            <div className="ledger-col-header col-hdr-outward" style={{ marginBottom: '1.25rem' }}>
              <div className="col-hdr-title">
                <i className="fas fa-truck-ramp-box"></i>
                <span>OUTWARD EMPTY BAGS</span>
              </div>
              <span className="col-hdr-count">{outwardRows.length} Varieties</span>
            </div>
            <div className="ledger-single-cards-grid">
              {outwardRows.map((row, idx) => (
                <LedgerStockCard 
                  key={row.variety_id || idx}
                  row={row}
                  type="outward"
                  index={idx}
                  onSelectVariety={setSelectedVarietyId}
                  onPreviewPhoto={setPreviewPhoto}
                  getPhotoInfo={getPhotoInfo}
                />
              ))}
            </div>
            {outwardRows.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                No outward records found matching the current filters.
              </div>
            )}
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
