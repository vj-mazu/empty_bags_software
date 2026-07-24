import React, { useState, useEffect } from 'react';
import { getApprovals, approveRequest, rejectRequest, getParties, getVarieties } from '../api';
import CustomConfirmModal from './CustomConfirmModal';

const Approvals = ({ showToast }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [varieties, setVarieties] = useState([]);

  // Custom confirmation state
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmColor: '',
    icon: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [pRes, vRes] = await Promise.all([getParties(), getVarieties()]);
        setParties(pRes.results || pRes.data || pRes || []);
        setVarieties(vRes.results || vRes.data || vRes || []);
      } catch (e) {
        console.error("Failed loading metadata for approvals view", e);
      }
      await fetchRequests();
      setLoading(false);
    };
    init();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await getApprovals();
      const rows = Array.isArray(res) ? res : (res.results || res.data || []);
      setRequests(rows.filter(r => r.status === 'PENDING'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = (id) => {
    setConfirmState({
      isOpen: true,
      title: 'Approve Request?',
      message: 'Are you sure you want to APPROVE this request? The changes will be applied to the database.',
      confirmText: 'Approve',
      confirmColor: '#10b981',
      icon: 'fa-circle-check',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await approveRequest(id);
          if (showToast) showToast('Request approved successfully!');
          fetchRequests();
        } catch (err) {
          if (showToast) showToast(err.message || 'Error approving request', 'error');
          else alert(err.message || 'Error approving request');
        }
      }
    });
  };

  const handleReject = (id) => {
    setConfirmState({
      isOpen: true,
      title: 'Reject Request?',
      message: 'Are you sure you want to REJECT this request? This action cannot be undone.',
      confirmText: 'Reject',
      confirmColor: '#ef4444',
      icon: 'fa-triangle-exclamation',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await rejectRequest(id);
          if (showToast) showToast('Request rejected.');
          fetchRequests();
        } catch (err) {
          if (showToast) showToast(err.message || 'Error rejecting request', 'error');
          else alert(err.message || 'Error rejecting request');
        }
      }
    });
  };

  const formatKeyName = (k) => {
    if (k === 'lf_toggle') return 'LF Toggle';
    if (k === 'lf_amount') return 'LF Amount';
    return k.charAt(0).toUpperCase() + k.slice(1).replace('_', ' ');
  };

  const getDisplayValue = (k, v) => {
    if (k === 'party') {
      const found = parties.find(p => String(p.id) === String(v));
      return found ? found.name : v;
    }
    if (k === 'variety') {
      const found = varieties.find(varObj => String(varObj.id) === String(v));
      return found ? found.name : v;
    }
    if (k === 'lf_toggle') {
      return v ? 'Yes' : 'No';
    }
    return String(v);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '0 1.5rem' }}>
      <div className="card-hdr" style={{ marginBottom: '1.25rem' }}>
        <h2 className="card-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-clipboard-check" style={{ color: '#2563eb' }}></i> Edit &amp; Delete Approvals
          <span style={{ fontSize: '0.82rem', background: '#fee2e2', color: '#991b1b', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
            {requests.length} Pending
          </span>
        </h2>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading pending approvals...</div>}

      {!loading && requests.length === 0 && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-circle-check" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '0.75rem' }}></i>
          <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No pending approval requests.</p>
          <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>All staff edits and deletions are fully processed.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {requests.map(req => (
          <div className="card" key={req.id} style={{ borderLeft: req.action_type === 'DELETE' ? '4px solid #ef4444' : '4px solid #f59e0b', borderTop: req.target_model === 'OUTWARD' ? '4px solid #ef4444' : '4px solid #10b981', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className={`role-pill ${req.action_type === 'DELETE' ? 'role-owner' : 'role-staff'}`} style={{ textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 800 }}>
                {req.action_type} Request
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                {new Date(req.created_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>
                {req.target_model} Entry #{req.target_id}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.15rem' }}>
                Requested by: <span style={{ fontWeight: 700, color: '#475569' }}>{req.requested_by_username}</span>
              </div>
            </div>

            {req.action_type === 'EDIT' && req.proposed_data && (
              <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.76rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase', fontSize: '0.62rem' }}>Proposed Changes:</div>
                {Object.entries(req.proposed_data).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{formatKeyName(k)}:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{getDisplayValue(k, v)}</span>
                  </div>
                ))}
              </div>
            )}

            {req.action_type === 'DELETE' && (
              <div style={{ background: '#fef2f2', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fee2e2', fontSize: '0.76rem', color: '#991b1b', marginBottom: '1rem', fontWeight: 600 }}>
                <i className="fas fa-exclamation-triangle"></i> This action will permanently delete the transaction record.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-green btn-sm" onClick={() => handleApprove(req.id)} style={{ flex: 1 }}>
                <i className="fas fa-check"></i> Approve
              </button>
              <button className="btn btn-red btn-sm" onClick={() => handleReject(req.id)} style={{ flex: 1 }}>
                <i className="fas fa-times"></i> Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <CustomConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmColor={confirmState.confirmColor}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Approvals;
