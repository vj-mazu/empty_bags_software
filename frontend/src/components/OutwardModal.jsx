import React, { useState, useEffect } from 'react';
import { createOutward, updateOutward, createApprovalRequest, getParties, getVarieties, getPlaces } from '../api';
import { formatINR } from '../utils/formatters';

const OutwardModal = ({ onClose, onSaved, parties: initialParties, varieties: initialVarieties, showToast, editItem, user }) => {
  const [parties, setParties] = useState(initialParties || []);
  const [varieties, setVarieties] = useState(initialVarieties || []);
  const [places, setPlaces] = useState([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyId, setPartyId] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [bags, setBags] = useState('');
  const [rate, setRate] = useState('');
  const [lfOn, setLfOn] = useState(false);
  const [lfAmount, setLfAmount] = useState('');
  const [isTransfer, setIsTransfer] = useState(false);
  const [fromPlaceName, setFromPlaceName] = useState('');
  const [toPlaceId, setToPlaceId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialParties || initialParties.length === 0) {
      getParties().then(res => setParties(res.results || res.data || res)).catch(console.error);
    }
    if (!initialVarieties || initialVarieties.length === 0) {
      getVarieties().then(res => setVarieties(res.results || res.data || res)).catch(console.error);
    }
    getPlaces().then(res => setPlaces(res.results || res.data || res)).catch(console.error);
  }, [initialParties, initialVarieties]);

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
      setIsTransfer(editItem.is_transfer || false);
      setFromPlaceName(editItem.from_place_name || '');
      setToPlaceId(editItem.to_place ? String(editItem.to_place) : '');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceNo.trim() || !partyId || !varietyId || !bags || !rate) {
      setError('Please fill all required fields');
      return;
    }
    if (isTransfer && !toPlaceId) {
      setError('Please select a destination place / branch for the transfer');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const payload = {
        invoice_no: invoiceNo.trim(),
        date,
        party: partyId,
        variety: varietyId,
        bags: numBags,
        rate: numRate,
        lf_toggle: lfOn,
        lf_amount: numLfAmount,
        is_transfer: isTransfer,
        from_place_name: isTransfer ? (fromPlaceName || 'Main Mill') : null,
        to_place: isTransfer ? toPlaceId : null
      };

      const savedUser = (() => { try { return JSON.parse(localStorage.getItem('mother_india_user') || '{}'); } catch(e){ return {}; } })();
      const isOwner = user?.role === 'OWNER' || savedUser?.role === 'OWNER';

      if (editItem) {
        if (isOwner) {
          await updateOutward(editItem.id, payload);
          if (showToast) showToast('Outward entry updated successfully!');
        } else {
          await createApprovalRequest({
            action_type: 'EDIT',
            target_model: 'OUTWARD',
            target_id: editItem.id,
            proposed_data: payload
          });
          if (showToast) showToast('Edit request submitted for Owner approval!');
        }
      } else {
        await createOutward(payload);
        if (showToast) showToast('Outward entry created successfully!');
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save outward entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-hdr">
          <div className="modal-title" style={{ color: '#2563eb' }}>
            <i className="fas fa-minus-circle"></i> {editItem ? 'Edit Outward Entry' : 'New Outward Entry'}
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
                placeholder="e.g. OUT-5012" 
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
              <label>Customer / Party</label>
              <select className="input" value={partyId} onChange={e => setPartyId(e.target.value)} required>
                <option value="">Select Party</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.shortcut_name ? `(${p.shortcut_name})` : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Variety</label>
              <select className="input" value={varietyId} onChange={e => setVarietyId(e.target.value)} required>
                <option value="">Select Variety</option>
                {varieties.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.kgs_per_bag} kg)</option>
                ))}
              </select>
            </div>
            
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
                style={{ background: '#f8fafc', fontWeight: 700, color: '#2563eb' }} 
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

          {/* Transfer & LF Handling Options */}
          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: isTransfer || lfOn ? '0.85rem' : 0 }}>
              <div className="toggle-row">
                <label className="toggle">
                  <input type="checkbox" checked={isTransfer} onChange={e => setIsTransfer(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
                <span style={{ fontWeight: 700, color: isTransfer ? '#2563eb' : '#334155' }}>
                  <i className="fas fa-truck-moving" style={{ marginRight: '4px' }}></i> Inter-Branch Transfer
                </span>
              </div>

              <div className="toggle-row">
                <label className="toggle">
                  <input type="checkbox" checked={lfOn} onChange={e => setLfOn(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
                <span style={{ fontWeight: 600, color: '#334155' }}>Enable LF Charge</span>
              </div>
            </div>

            {isTransfer && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#eff6ff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: lfOn ? '0.85rem' : 0 }}>
                <div className="form-group">
                  <label style={{ color: '#1e40af', fontWeight: 700 }}>From Location</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={fromPlaceName} 
                    onChange={e => setFromPlaceName(e.target.value)} 
                    placeholder="e.g. Main Mill" 
                    required={isTransfer}
                  />
                </div>
                <div className="form-group">
                  <label style={{ color: '#1e40af', fontWeight: 700 }}>To Branch / Place</label>
                  <select 
                    className="input" 
                    value={toPlaceId} 
                    onChange={e => setToPlaceId(e.target.value)} 
                    required={isTransfer}
                  >
                    <option value="">Select Destination</option>
                    {places.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {lfOn && (
              <div style={{ marginTop: '0.85rem' }}>
                <div className="form-group">
                  <label style={{ color: '#2563eb' }}>Total LF Amount (₹)</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>COST PER BAG</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{formatINR(perBagCostVal)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.65rem 0.85rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 700 }}>GRAND TOTAL</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1d4ed8' }}>{formatINR(netTotalVal)}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-blue" disabled={loading}>
              <i className="fas fa-paper-plane"></i> {loading ? 'Submitting...' : 'Submit Outward Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OutwardModal;
