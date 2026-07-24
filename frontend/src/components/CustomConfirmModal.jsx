import React from 'react';

const CustomConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Proceed", cancelText = "Cancel", confirmColor = "#dc2626", icon = "fa-circle-question" }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: '400px', textAlign: 'center', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <div style={{ fontSize: '2.5rem', color: confirmColor, marginBottom: '0.85rem' }}>
          <i className={`fas ${icon}`}></i>
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>{title}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.4' }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ flex: 1, padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
            {cancelText}
          </button>
          <button type="button" className="btn" onClick={onConfirm} style={{ flex: 1, padding: '0.45rem 1rem', backgroundColor: confirmColor, color: '#fff', fontSize: '0.82rem', fontWeight: 600, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomConfirmModal;
