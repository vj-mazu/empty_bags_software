import React, { useState, useEffect } from 'react';
import { createInward, updateInward, createApprovalRequest, getParties, getVarieties } from '../api';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
};

const InwardModal = ({ onClose, onSaved, parties: initialParties, varieties: initialVarieties, showToast, editItem, user }) => {
  const [parties, setParties] = useState(initialParties || []);
  const [varieties, setVarieties] = useState(initialVarieties || []);
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
  }, [initialParties, initialVarieties]);

  useEffect(() => {
    if (editItem) {
      setDate(editItem.date || '');
      setPartyId(editItem.party ? String(editItem.party) : '');
      setVarietyId(editItem.variety ? String(editItem.variety) : '');
      setBags(editItem.bags || '');
      setRate(editItem.rate || '');
      setLfOn(editItem.lf_toggle || false);
      setLfAmount(editItem.lf_amount || '');
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
    if (!partyId || !varietyId || !bags || !rate) {
      setError('Please fill all required fields');
      return;
    }

    try {
      loading || setLoading(true);
      setError('');
      
      const payload = {
        date,
        party: partyId,
        variety: varietyId,
        bags: numBags,
        rate: numRate,
        lf_toggle: lfOn,
        lf_amount: numLfAmount
      };

      if (editItem) {
        if (user?.role === 'OWNER') {
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
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '620px' }}>
        <div className="modal-hdr">
          <div className="modal-title" style={{ color: '#10b981' }}>
            <i className="fas fa-plus-circle"></i> {editItem ? 'Edit Inward Entry' : 'Create Inward Entry'}
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
              <label>Date</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            
            <div className="form-group">
              <label>Purchase From (Party)</label>
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
                  <option key={v.id} value={v.id}>{v.name} ({v.kgs_per_bag} kg/bag)</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>No. of Bags</label>
              <input type="number" className="input" value={bags} onChange={e => setBags(e.target.value)} min="1" required placeholder="0" />
            </div>

            <div className="form-group">
              <label>Per Bag Weight (auto)</label>
              <input type="text" className="input" value={`${perBagWeight} kg`} readOnly style={{ background: '#f8fafc', fontWeight: 700 }} />
            </div>

            <div className="form-group">
              <label>Total Weight Kgs (auto)</label>
              <input type="text" className="input" value={`${totalWeightKgs.toLocaleString()} kg`} readOnly style={{ background: '#f8fafc', fontWeight: 700, color: '#10b981' }} />
            </div>
            
            <div className="form-group">
              <label>Rate per Bag (₹)</label>
              <input type="number" className="input" step="0.01" value={rate} onChange={e => setRate(e.target.value)} min="0" required placeholder="0.00" />
            </div>
            
            <div className="form-group">
              <label>Total Rate Value (auto)</label>
              <input type="text" className="input" value={formatINR(totalRateVal)} readOnly style={{ fontWeight: 700, color: '#2563eb', background: '#f8fafc' }} />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <div className="toggle-row" style={{ marginTop: 0 }}>
              <label className="toggle">
                <input type="checkbox" checked={lfOn} onChange={e => setLfOn(e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
              <span>Enable LF Handling Charge</span>
            </div>

            {lfOn && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '0.85rem' }}>
                <div className="form-group">
                  <label style={{ color: '#059669' }}>Total LF Charge Amount (₹)</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>AUTO COST PER BAG</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{formatINR(perBagCostVal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>NET GRAND TOTAL:</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1d4ed8' }}>{formatINR(netTotalVal)}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-green" disabled={loading}>
              <i className="fas fa-save"></i> {loading ? 'Saving...' : 'Save Inward Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InwardModal;
