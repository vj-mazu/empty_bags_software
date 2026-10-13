import React, { useState, useEffect } from 'react';
import { createInward, updateInward, createApprovalRequest, getParties, getVarieties, getFloors, getFloorStock } from '../api';
import { formatINR } from '../utils/formatters';
import SearchableSelect from './SearchableSelect';

const InwardModal = ({ onClose, onSaved, parties: initialParties, varieties: initialVarieties, showToast, editItem, user }) => {
  const [parties, setParties] = useState(initialParties || []);
  const [varieties, setVarieties] = useState(initialVarieties || []);
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState('');
  const [allocationMode, setAllocationMode] = useState('single'); // 'single' | 'split'
  const [allocMap, setAllocMap] = useState({}); // { [floorId]: string bags }
  const [floorStockData, setFloorStockData] = useState(null);
  const [loadingFloorStock, setLoadingFloorStock] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyId, setPartyId] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [bags, setBags] = useState('');
  const [rate, setRate] = useState('');
  const [lfOn, setLfOn] = useState(false);
  const [lfAmount, setLfAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialParties || initialParties.length === 0) {
      getParties().then(res => setParties(res.results || res.data || res)).catch(console.error);
    }
    if (!initialVarieties || initialVarieties.length === 0) {
      getVarieties().then(res => setVarieties(res.results || res.data || res)).catch(console.error);
    }
    getFloors().then(res => setFloors(res.results || res.data || res)).catch(console.error);
  }, [initialParties, initialVarieties]);

  useEffect(() => {
    if (varietyId) {
      setLoadingFloorStock(true);
      getFloorStock(varietyId)
        .then(res => setFloorStockData(res))
        .catch(console.error)
        .finally(() => setLoadingFloorStock(false));
    } else {
      setFloorStockData(null);
    }
  }, [varietyId]);

  useEffect(() => {
    if (editItem) {
      setInvoiceNo(editItem.invoice_no || '');
      setDate(editItem.date || '');
      setPartyId(editItem.party ? String(editItem.party) : '');
      setVarietyId(editItem.variety ? String(editItem.variety) : '');
      setBags(editItem.bags || '');
      setRate(editItem.rate || '');
      setLfOn(editItem.lf_toggle || false);
      setLfAmount(editItem.lf_amount || '');

      if (editItem.floor_allocations && Array.isArray(editItem.floor_allocations) && editItem.floor_allocations.length > 0) {
        const map = {};
        editItem.floor_allocations.forEach(item => {
          if (item.floor_id) {
            map[item.floor_id] = String(item.bags || '');
          }
        });
        setAllocMap(map);
        if (editItem.floor_allocations.length > 1) {
          setAllocationMode('split');
          setFloorId('');
        } else {
          setAllocationMode('single');
          setFloorId(String(editItem.floor_allocations[0].floor_id || ''));
        }
      } else if (editItem.floor) {
        setFloorId(String(editItem.floor));
        setAllocationMode('single');
        setAllocMap({});
      } else {
        setFloorId('');
        setAllocationMode('single');
        setAllocMap({});
      }
    }
  }, [editItem]);

  const selectedVariety = varieties.find(v => String(v.id) === String(varietyId));
  const perBagWeight = selectedVariety ? Number(selectedVariety.kgs_per_bag) : 0;

  const numBags = Number(bags) || 0;
  const numRate = Number(rate) || 0;
  const numLfAmount = lfOn ? (Number(lfAmount) || 0) : 0;

  const totalRateVal = numBags * numRate;
  const totalWeightKgs = numBags * perBagWeight;
  const netTotalVal = totalRateVal + numLfAmount;
  const perBagCostVal = numBags > 0 ? (netTotalVal / numBags) : 0;

  // Split calculations
  const allocSum = floors.reduce((sum, f) => sum + (Number(allocMap[f.id]) || 0), 0);
  const remainingToAlloc = numBags - allocSum;

  const handleFillRemainder = (floorIdToFill) => {
    const otherSum = floors.reduce((sum, f) => {
      if (String(f.id) === String(floorIdToFill)) return sum;
      return sum + (Number(allocMap[f.id]) || 0);
    }, 0);
    const needed = Math.max(0, numBags - otherSum);
    setAllocMap(prev => ({ ...prev, [floorIdToFill]: String(needed) }));
  };

  const isSubmittingRef = React.useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    if (!invoiceNo.trim() || !partyId || !varietyId || !bags || !rate) {
      setError('Please fill all required fields');
      return;
    }

    let payloadFloor = null;
    let payloadAllocations = [];

    if (allocationMode === 'split') {
      if (allocSum !== numBags) {
        setError(`Total allocated floor bags (${allocSum}) must exactly equal total inward bags (${numBags})! Difference: ${Math.abs(remainingToAlloc)} bags.`);
        return;
      }
      const activeAllocs = floors
        .filter(f => (Number(allocMap[f.id]) || 0) > 0)
        .map(f => ({
          floor_id: f.id,
          floor_name: f.name,
          bags: Number(allocMap[f.id])
        }));
      payloadAllocations = activeAllocs;
      payloadFloor = activeAllocs.length === 1 ? activeAllocs[0].floor_id : (activeAllocs[0]?.floor_id || null);
    } else {
      if (floorId) {
        const flObj = floors.find(f => String(f.id) === String(floorId));
        payloadFloor = parseInt(floorId, 10);
        payloadAllocations = [{
          floor_id: parseInt(floorId, 10),
          floor_name: flObj ? flObj.name : `Floor #${floorId}`,
          bags: numBags
        }];
      } else {
        payloadFloor = null;
        payloadAllocations = [];
      }
    }

    try {
      isSubmittingRef.current = true;
      setLoading(true);
      setError('');
      
      const payload = {
        invoice_no: invoiceNo.trim(),
        date,
        party: partyId,
        variety: varietyId,
        floor: payloadFloor,
        floor_allocations: payloadAllocations,
        bags: numBags,
        rate: numRate,
        lf_toggle: lfOn,
        lf_amount: numLfAmount
      };

      const savedUser = (() => { try { return JSON.parse(localStorage.getItem('mother_india_user') || '{}'); } catch(e){ return {}; } })();
      const isOwner = user?.role === 'OWNER' || savedUser?.role === 'OWNER';

      if (editItem) {
        if (isOwner) {
          await updateInward(editItem.id, payload);
          if (showToast) showToast('Inward entry updated successfully!');
        } else {
          await createApprovalRequest({
            action_type: 'EDIT',
            target_model: 'INWARD',
            target_id: editItem.id,
            proposed_data: payload
          });
          if (showToast) showToast('Edit request submitted for Owner approval!');
        }
      } else {
        await createInward(payload);
        if (showToast) showToast('Inward entry created successfully!');
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save inward entry');
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-hdr">
          <div className="modal-title" style={{ color: '#10b981' }}>
            <i className="fas fa-plus-circle"></i> {editItem ? 'Edit Inward Entry' : 'New Inward Entry'}
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        {error && (
          <div className="alert-item alert-low" style={{ marginBottom: '1rem' }}>
            <i className="fas fa-exclamation-triangle"></i> {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Bill / Invoice No</label>
              <input 
                type="text" 
                className="input" 
                value={invoiceNo} 
                onChange={e => setInvoiceNo(e.target.value)} 
                required 
                placeholder="e.g. INV-1001" 
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                className="input" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Party / Supplier</label>
              <SearchableSelect 
                options={parties.map(p => ({ id: p.id, name: `${p.name} ${p.shortcut_name ? `(${p.shortcut_name})` : ''}` }))}
                value={partyId}
                onChange={setPartyId}
                placeholder="Search & Select Party..."
                required={true}
              />
            </div>
            
            <div className="form-group">
              <label>Variety</label>
              <SearchableSelect 
                options={varieties.map(v => ({ id: v.id, name: `${v.name} (${v.kgs_per_bag} kg)` }))}
                value={varietyId}
                onChange={setVarietyId}
                placeholder="Search & Select Variety..."
                required={true}
              />
            </div>
          </div>

          {/* Floor Allocation Mode & Section */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-layer-group" style={{ color: '#10b981' }}></i> Godown Floor Allocation
              </span>
              <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setAllocationMode('single')}
                  style={{
                    border: 'none',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: allocationMode === 'single' ? '#10b981' : 'transparent',
                    color: allocationMode === 'single' ? '#ffffff' : '#475569'
                  }}
                >
                  Single Floor
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationMode('split')}
                  style={{
                    border: 'none',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: allocationMode === 'split' ? '#10b981' : 'transparent',
                    color: allocationMode === 'split' ? '#ffffff' : '#475569'
                  }}
                >
                  Split Across Multiple Floors
                </button>
              </div>
            </div>

            {allocationMode === 'single' ? (
              <div>
                <SearchableSelect 
                  options={[{ id: '', name: 'Unassigned / General' }, ...floors.map(f => ({ id: f.id, name: f.name }))]}
                  value={floorId}
                  onChange={setFloorId}
                  placeholder="Select Target Floor (e.g. Ground Floor, 1st Floor)..."
                />

                {/* Live Floor-Wise Existing Stock Display */}
                {selectedVariety && floorStockData && (
                  <div style={{ marginTop: '0.65rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Current Stock on Floors for {selectedVariety.name} (Click to select):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {floorStockData.floors && floorStockData.floors.length > 0 ? (
                        floorStockData.floors.map(f => {
                          const isSelected = String(floorId) === String(f.floor_id);
                          return (
                            <div 
                              key={f.floor_id || 'unassigned'}
                              onClick={() => f.floor_id && setFloorId(String(f.floor_id))}
                              style={{
                                cursor: f.floor_id ? 'pointer' : 'default',
                                background: isSelected ? '#dcfce7' : '#ffffff',
                                border: isSelected ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                              title={f.floor_id ? `Click to choose ${f.floor_name}` : ""}
                            >
                              <span style={{ fontWeight: 600, color: '#334155' }}>{f.floor_name}:</span>
                              <strong style={{ color: f.bags > 0 ? '#15803d' : '#64748b' }}>{f.bags.toLocaleString()} Bags</strong>
                              {isSelected && <i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i>}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>No floor stock recorded yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Multi-Floor Split Table */
              <div>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Floor Name</th>
                      <th style={{ padding: '6px 8px' }}>Current Stock</th>
                      <th style={{ padding: '6px 8px', width: '130px' }}>Inward Bags</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '80px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {floors.map(f => {
                      const curFloorData = floorStockData?.floors?.find(x => x.floor_id === f.id);
                      const curBags = curFloorData ? curFloorData.bags : 0;
                      const val = allocMap[f.id] || '';
                      return (
                        <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{f.name}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{curBags.toLocaleString()} bags</td>
                          <td style={{ padding: '4px 8px' }}>
                            <input 
                              type="number"
                              className="input"
                              style={{ padding: '4px 6px', fontSize: '0.75rem', height: '28px' }}
                              value={val}
                              onChange={e => {
                                const v = e.target.value;
                                setAllocMap(prev => ({ ...prev, [f.id]: v }));
                              }}
                              min="0"
                              placeholder="0"
                            />
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleFillRemainder(f.id)}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                color: '#0f172a'
                              }}
                              title="Assign all remaining bags to this floor"
                            >
                              Fill Left
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Allocation balance summary indicator */}
                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem' }}>
                  <div style={{ fontWeight: 700, color: '#334155' }}>
                    Allocated: <strong>{allocSum}</strong> / Required: <strong>{numBags}</strong> Bags
                  </div>
                  {numBags > 0 && (
                    <div>
                      {allocSum === numBags ? (
                        <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fas fa-check-circle"></i> Exactly Matched ({numBags} Bags)
                        </span>
                      ) : allocSum < numBags ? (
                        <span style={{ color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fas fa-info-circle"></i> Need {remainingToAlloc} more bags
                        </span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fas fa-exclamation-circle"></i> Exceeds by {allocSum - numBags} bags!
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            
            <div className="form-group">
              <label>Number of Bags</label>
              <input 
                type="number" 
                className="input" 
                value={bags} 
                onChange={e => setBags(e.target.value)} 
                min="1" 
                required 
                placeholder="0" 
              />
            </div>

            <div className="form-group">
              <label>Bag Weight</label>
              <input 
                type="text" 
                className="input" 
                value={perBagWeight > 0 ? `${perBagWeight} kg` : '-'} 
                readOnly 
                style={{ background: '#f8fafc', fontWeight: 600, color: '#334155' }} 
              />
            </div>

            <div className="form-group">
              <label>Total Weight</label>
              <input 
                type="text" 
                className="input" 
                value={totalWeightKgs > 0 ? `${totalWeightKgs.toLocaleString()} kg` : '0 kg'} 
                readOnly 
                style={{ background: '#f8fafc', fontWeight: 700, color: '#059669' }} 
              />
            </div>
            
            <div className="form-group">
              <label>Rate per Bag (₹)</label>
              <input 
                type="number" 
                className="input" 
                step="0.01" 
                value={rate} 
                onChange={e => setRate(e.target.value)} 
                min="0" 
                required 
                placeholder="0.00" 
              />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <div className="toggle-row">
              <label className="toggle">
                <input type="checkbox" checked={lfOn} onChange={e => setLfOn(e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
              <span style={{ fontWeight: 600, color: '#334155' }}>Enable LF Handling Charge</span>
            </div>

            {lfOn && (
              <div style={{ marginTop: '0.85rem' }}>
                <div className="form-group">
                  <label style={{ color: '#059669' }}>Total LF Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input" 
                    value={lfAmount} 
                    onChange={e => setLfAmount(e.target.value)} 
                    placeholder="0.00" 
                    required={lfOn} 
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: 0 }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>COST PER BAG</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{formatINR(perBagCostVal)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.65rem 0.85rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', minWidth: 0 }}>
              <span style={{ fontSize: '0.72rem', color: '#065f46', fontWeight: 700 }}>GRAND TOTAL</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>{formatINR(netTotalVal)}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button 
              type="submit" 
              className="btn btn-green" 
              disabled={loading}
              style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1 }}
            >
              <i className={loading ? "fas fa-spinner fa-spin" : "fas fa-check"} style={{ marginRight: '6px' }}></i> 
              {loading ? 'Saving...' : (editItem ? 'Update Inward Entry' : 'Save Inward Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InwardModal;
