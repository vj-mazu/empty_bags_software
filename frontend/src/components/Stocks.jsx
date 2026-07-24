import React, { useState, useEffect } from 'react';
import { getVarieties, getInwards, getOutwards, downloadPdf, deleteInward, deleteOutward, createApprovalRequest, getApprovals } from '../api';
import InwardModal from './InwardModal';
import OutwardModal from './OutwardModal';

import CustomConfirmModal from './CustomConfirmModal';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
};

const formatDateString = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const Stocks = ({ user, showToast }) => {
  const [varieties, setVarieties] = useState([]);
  const [inwards, setInwards] = useState([]);
  const [outwards, setOutwards] = useState([]);
  const [search, setSearch] = useState('');
  
  const [showInward, setShowInward] = useState(false);
  const [showOutward, setShowOutward] = useState(false);

  const [businessDate, setBusinessDate] = useState('');
  const [openingStock, setOpeningStock] = useState(0);
  const [closingStock, setClosingStock] = useState(0);
  const [filterDate, setFilterDate] = useState('');

  const [editingInward, setEditingInward] = useState(null);
  const [editingOutward, setEditingOutward] = useState(null);
  const [pendingMap, setPendingMap] = useState({});

  // Custom confirmation modal state
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmColor: '',
    onConfirm: () => {}
  });

  const handleDeleteClick = (type, id) => {
    setConfirmState({
      isOpen: true,
      title: `Delete ${type.toUpperCase()} Entry?`,
      message: `Are you sure you want to delete this ${type} entry? This request will delete the transaction.`,
      confirmText: 'Delete',
      confirmColor: '#dc2626',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          if (user?.role === 'OWNER') {
            if (type === 'inward') {
              await deleteInward(id);
            } else {
              await deleteOutward(id);
            }
            if (showToast) showToast('Entry deleted successfully!');
            fetchData();
          } else {
            await createApprovalRequest({
              action_type: 'DELETE',
              target_model: type === 'inward' ? 'INWARD' : 'OUTWARD',
              target_id: id
            });
            if (showToast) showToast('Deletion request submitted for Owner approval!');
          }
        } catch (err) {
          if (showToast) showToast(err.message || 'Failed to delete entry', 'error');
          else alert(err.message || 'Failed to delete entry');
        }
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const fetchData = async () => {
    try {
      const vRes = await getVarieties();
      setVarieties(vRes.results || vRes.data || vRes);
      
      const inRes = await getInwards({ all: 'true' });
      const inRows = Array.isArray(inRes) ? inRes : (inRes.results || inRes.data || inRes || []);
      
      const outRes = await getOutwards({ all: 'true' });
      const outRows = Array.isArray(outRes) ? outRes : (outRes.results || outRes.data || outRes || []);
      
      let pMap = {};
      try {
        const appRes = await getApprovals();
        const approvalsList = Array.isArray(appRes) ? appRes : (appRes.results || appRes.data || appRes || []);
        approvalsList.forEach(a => {
          if (a.status === 'PENDING') {
            pMap[`${a.target_model}_${a.target_id}`] = a;
          }
        });
      } catch (e) {
        console.error("Failed to fetch approvals in Stocks", e);
      }
      setPendingMap(pMap);
      
      const getBusinessTodayStr = () => {
        const now = new Date();
        const hours = now.getHours();
        const formatLocal = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const r = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${r}`;
        };
        if (hours < 6) {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          return formatLocal(yesterday);
        }
        return formatLocal(now);
      };
      const todayStr = getBusinessTodayStr();
      const activeDate = filterDate || todayStr;
      setBusinessDate(activeDate);

      let openingIn = 0, openingOut = 0;
      let todayIn = 0, todayOut = 0;

      inRows.forEach(item => {
        if (item.date < activeDate) openingIn += Number(item.bags || 0);
        else if (item.date === activeDate) todayIn += Number(item.bags || 0);
      });

      outRows.forEach(item => {
        if (item.date < activeDate) openingOut += Number(item.bags || 0);
        else if (item.date === activeDate) todayOut += Number(item.bags || 0);
      });

      const op = openingIn - openingOut;
      const cl = op + todayIn - todayOut;

      setOpeningStock(op);
      setClosingStock(cl);

      const todayInRows = inRows.filter(item => item.date === activeDate).sort((a, b) => (a.sl_no || 0) - (b.sl_no || 0));
      const todayOutRows = outRows.filter(item => item.date === activeDate).sort((a, b) => (a.sl_no || 0) - (b.sl_no || 0));

      setInwards(todayInRows);
      setOutwards(todayOutRows);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaved = () => {
    fetchData();
  };

  const handleDownloadPdf = (type, id) => {
    try {
      downloadPdf(type, id);
    } catch (err) {
      if (showToast) {
        showToast('Error downloading PDF: ' + err.message, 'error');
      } else {
        alert('Error downloading PDF: ' + err.message);
      }
    }
  };

  const filteredVarieties = Array.isArray(varieties) ? varieties.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '0 1.5rem' }}>
      
      {/* HEADER SECTION */}
      <div className="card-hdr" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-boxes-stacked" style={{ color: '#2563eb' }}></i> Stocks
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            (Date: {businessDate ? formatDateString(businessDate) : ''})
          </span>
        </h2>
        
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginRight: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Select Date:</label>
            <input 
              type="date" 
              className="input" 
              value={filterDate || businessDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', width: '135px' }}
            />
          </div>
          <button className="btn btn-green" onClick={() => setShowInward(true)}>
            <i className="fas fa-plus-circle"></i> + Inward Entry
          </button>
          <button className="btn btn-blue" onClick={() => setShowOutward(true)}>
            <i className="fas fa-minus-circle"></i> - Outward Entry
          </button>
        </div>
      </div>

      {/* TODAY'S OPENING STOCK (At Top) */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
          <i className="fas fa-boxes" style={{ color: '#2563eb', fontSize: '1.15rem' }}></i>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Opening Stock</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a8a' }}>{openingStock.toLocaleString()} Bags</div>
          </div>
        </div>
      </div>

      {/* REGISTERS GRID (Side-By-Side Layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        
        {/* INWARD REGISTER */}
        <div className="card" style={{ margin: 0, borderTop: '4px solid #10b981' }}>
          <div className="card-hdr" style={{ padding: '0.5rem 0.75rem' }}>
            <div className="card-title" style={{ color: '#10b981', fontSize: '0.9rem' }}>
              <i className="fas fa-boxes-packing"></i> Inward Register
            </div>
          </div>
          <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ tableLayout: 'auto', width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th className="mobile-hide" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '4%' }}>SL<br/>No</th>
                  <th style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '15%' }}>Invoice<br/>No</th>
                  <th style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '22%' }}>Party</th>
                  <th style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '18%' }}>Variety</th>
                  <th style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '8%' }}>Bags</th>
                  <th className="mobile-hide" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '5%' }}>LF</th>
                  <th style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '12%' }}>Value</th>
                  <th className="mobile-hide" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '8%' }}>P/B<br/>Cost</th>
                  <th style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '8%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(inwards) && inwards.map((item, index) => {
                  const isPending = pendingMap[`INWARD_${item.id}`];
                  return (
                    <tr key={item.id} style={isPending ? { backgroundColor: '#fef08a' } : {}}>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.25rem', fontWeight: 700, textAlign: 'center' }}>{index + 1}</td>
                      <td className="text-blue" style={{ padding: '0.35rem 0.25rem' }}>
                        <div style={{ wordBreak: 'break-all' }}>{item.invoice_no}</div>
                        {isPending && (
                          <div style={{ display: 'inline-block', fontSize: '0.55rem', background: '#d97706', color: '#fff', padding: '1px 3px', borderRadius: '3px', marginTop: '0.15rem', fontWeight: 'bold' }}>
                            PENDING {isPending.action_type}
                          </div>
                        )}
                      </td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.25rem' }}>{item.party_name}</td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.25rem' }}>{item.variety_name}</td>
                      <td style={{ padding: '0.35rem 0.25rem', fontWeight: 700, textAlign: 'center' }}>{item.bags}</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.25rem', textAlign: 'center' }}>{item.lf_toggle ? formatINR(item.lf_amount) : '-'}</td>
                      <td className="text-green" style={{ padding: '0.35rem 0.25rem', textAlign: 'right' }}>{formatINR(item.total_value)}</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.25rem', fontWeight: 700, textAlign: 'right' }}>
                        {formatINR(item.per_bag_cost && Number(item.per_bag_cost) > 0 ? item.per_bag_cost : (Number(item.total_value) / Number(item.bags || 1)))}
                      </td>
                      <td style={{ padding: '0.35rem 0.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center', alignItems: 'center' }}>
                          <button className="btn btn-ghost btn-sm" title="Download PDF" onClick={() => handleDownloadPdf('inward', item.id)} style={{ padding: '1px' }}>
                            <i className="fas fa-file-pdf" style={{ color: '#ef4444' }}></i>
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => { setEditingInward(item); setShowInward(true); }} style={{ padding: '1px' }} disabled={!!isPending}>
                            <i className="fas fa-edit" style={{ color: isPending ? '#cbd5e1' : '#2563eb' }}></i>
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDeleteClick('inward', item.id)} style={{ padding: '1px' }} disabled={!!isPending}>
                            <i className="fas fa-trash" style={{ color: isPending ? '#cbd5e1' : '#dc2626' }}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!inwards || inwards.length === 0) && (
                  <tr><td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No inward records for today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OUTWARD REGISTER */}
        <div className="card" style={{ margin: 0, borderTop: '4px solid #ef4444' }}>
          <div className="card-hdr" style={{ padding: '0.5rem 0.75rem' }}>
            <div className="card-title" style={{ color: '#2563eb', fontSize: '0.9rem' }}>
              <i className="fas fa-truck-ramp-box" style={{ color: '#2563eb' }}></i> Outward Register
            </div>
          </div>
          <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ tableLayout: 'auto', width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th className="mobile-hide outward-th" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '4%' }}>SL<br/>No</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '15%' }}>Invoice<br/>No</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '22%' }}>Party</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '18%' }}>Variety</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '8%' }}>Bags</th>
                  <th className="mobile-hide outward-th" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '5%' }}>LF</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '12%' }}>Value</th>
                  <th className="mobile-hide outward-th" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '8%' }}>P/B<br/>Cost</th>
                  <th className="outward-th" style={{ padding: '0.35rem 0.25rem', fontSize: '0.74rem', whiteSpace: 'normal', lineHeight: '1.1', textAlign: 'center', width: '8%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(outwards) && outwards.map((item, index) => {
                  const isPending = pendingMap[`OUTWARD_${item.id}`];
                  return (
                    <tr key={item.id} style={isPending ? { backgroundColor: '#fef08a' } : {}}>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.25rem', fontWeight: 700, textAlign: 'center' }}>{index + 1}</td>
                      <td className="text-blue" style={{ padding: '0.35rem 0.25rem' }}>
                        <div style={{ wordBreak: 'break-all' }}>{item.invoice_no}</div>
                        {isPending && (
                          <div style={{ display: 'inline-block', fontSize: '0.55rem', background: '#d97706', color: '#fff', padding: '1px 3px', borderRadius: '3px', marginTop: '0.15rem', fontWeight: 'bold' }}>
                            PENDING {isPending.action_type}
                          </div>
                        )}
                      </td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.25rem' }}>{item.party_name}</td>
                      <td className="wrap-text" style={{ padding: '0.35rem 0.25rem' }}>{item.variety_name}</td>
                      <td style={{ padding: '0.35rem 0.25rem', fontWeight: 700, textAlign: 'center' }}>{item.bags}</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.25rem', textAlign: 'center' }}>{item.lf_toggle ? formatINR(item.lf_amount) : '-'}</td>
                      <td className="text-green" style={{ padding: '0.35rem 0.25rem', textAlign: 'right' }}>{formatINR(item.total_value)}</td>
                      <td className="mobile-hide" style={{ padding: '0.35rem 0.25rem', fontWeight: 700, textAlign: 'right' }}>
                        {formatINR(item.per_bag_cost && Number(item.per_bag_cost) > 0 ? item.per_bag_cost : (Number(item.total_value) / Number(item.bags || 1)))}
                      </td>
                      <td style={{ padding: '0.35rem 0.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center', alignItems: 'center' }}>
                          <button className="btn btn-ghost btn-sm" title="Download PDF" onClick={() => handleDownloadPdf('outward', item.id)} style={{ padding: '1px' }}>
                            <i className="fas fa-file-pdf" style={{ color: '#ef4444' }}></i>
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => { setEditingOutward(item); setShowOutward(true); }} style={{ padding: '1px' }} disabled={!!isPending}>
                            <i className="fas fa-edit" style={{ color: isPending ? '#cbd5e1' : '#2563eb' }}></i>
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDeleteClick('outward', item.id)} style={{ padding: '1px' }} disabled={!!isPending}>
                            <i className="fas fa-trash" style={{ color: isPending ? '#cbd5e1' : '#dc2626' }}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!outwards || outwards.length === 0) && (
                  <tr><td colSpan="9" style={{ textAlign: 'center', color: '#64748b' }}>No outward records for today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* TODAY'S CLOSING STOCK (At Bottom) */}
      <div style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px' }}>
          <i className="fas fa-cubes" style={{ color: '#d97706', fontSize: '1.15rem' }}></i>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Closing Stock</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#b45309' }}>{closingStock.toLocaleString()} Bags</div>
          </div>
        </div>
      </div>

      {showInward && (
        <InwardModal 
          onClose={() => { setShowInward(false); setEditingInward(null); }} 
          onSaved={handleSaved}
          varieties={varieties}
          showToast={showToast}
          editItem={editingInward}
          user={user}
        />
      )}

      {showOutward && (
        <OutwardModal 
          onClose={() => { setShowOutward(false); setEditingOutward(null); }} 
          onSaved={handleSaved}
          varieties={varieties}
          showToast={showToast}
          editItem={editingOutward}
          user={user}
        />
      )}

      <CustomConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmColor={confirmState.confirmColor}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Stocks;
