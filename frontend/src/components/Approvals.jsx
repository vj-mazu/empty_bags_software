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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ tableLayout: 'auto', width: '100%', fontSize: '0.74rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center', width: '4%' }}>SL<br/>No</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center', width: '8%' }}>Type</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center', width: '8%' }}>Action</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center', width: '12%' }}>Invoice No</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center', width: '9%' }}>Date</th>
                <th style={{ padding: '0.4rem 0.3rem', width: '14%' }}>Party</th>
                <th style={{ padding: '0.4rem 0.3rem', width: '12%' }}>Variety</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center', width: '6%' }}>Bags</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'right', width: '9%' }}>Total Value</th>
                <th style={{ padding: '0.4rem 0.3rem', width: '18%' }}>Details / Changes</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center', width: '8%' }}>Requested By</th>
                <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center', width: '8%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => {
                const isDelete = req.action_type === 'DELETE';
                const rowBg = isDelete ? '#fee2e2' : '#fef08a';
                return (
                  <tr key={req.id} style={{ backgroundColor: rowBg }}>
                    <td style={{ padding: '0.4rem 0.3rem', fontWeight: 700, textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '0.4rem 0.3rem', textAlign: 'center' }}>
                      <span className={`role-pill ${req.target_model === 'OUTWARD' ? 'role-owner' : 'role-staff'}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                        {req.target_model}
                      </span>
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', color: '#fff', backgroundColor: isDelete ? '#dc2626' : '#d97706' }}>
                        {req.action_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', fontWeight: 700, textAlign: 'center', color: '#2563eb' }}>
                      {req.target_details?.invoice_no || `#${req.target_id}`}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {req.target_details?.date || '-'}
                    </td>
                    <td className="wrap-text" style={{ padding: '0.4rem 0.3rem', fontWeight: 600 }}>
                      {req.target_details?.party_name || '-'}
                    </td>
                    <td className="wrap-text" style={{ padding: '0.4rem 0.3rem', fontWeight: 600 }}>
                      {req.target_details?.variety_name || '-'}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', fontWeight: 700, textAlign: 'center', color: '#2563eb' }}>
                      {req.target_details?.bags || '-'}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', fontWeight: 700, textAlign: 'right', color: '#10b981' }}>
                      {req.target_details?.total_value ? `₹${Number(req.target_details.total_value).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', fontSize: '0.7rem' }}>
                      {isDelete ? (
                        <span style={{ color: '#991b1b', fontWeight: 700 }}>
                          <i className="fas fa-trash"></i> Requesting permanent deletion of record
                        </span>
                      ) : (
                        req.proposed_data && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            {Object.entries(req.proposed_data).map(([k, v]) => (
                              <div key={k}>
                                <span style={{ color: '#64748b' }}>{formatKeyName(k)}:</span> <strong style={{ color: '#b45309' }}>{getDisplayValue(k, v)}</strong>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                      {req.requested_by_username || 'Staff'}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button className="btn btn-green btn-sm" title="Approve" onClick={() => handleApprove(req.id)} style={{ padding: '2px 6px', fontSize: '0.68rem' }}>
                          <i className="fas fa-check"></i>
                        </button>
                        <button className="btn btn-red btn-sm" title="Reject" onClick={() => handleReject(req.id)} style={{ padding: '2px 6px', fontSize: '0.68rem' }}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
