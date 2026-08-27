import React, { useState, useEffect } from 'react';
import { 
  getUsers, createUser, updateUser, deleteUser,
  getPlaces, createPlace, updatePlace, deletePlace,
  getParties, createParty, updateParty, deleteParty,
  getVarieties, createVariety, updateVariety, deleteVariety
} from '../api';
import CustomConfirmModal from './CustomConfirmModal';

const MasterCreation = ({ user, activeSection, showToast }) => {
  const [currentMasterTab, setCurrentMasterTab] = useState(activeSection || 'party');
  const [searchTerm, setSearchTerm] = useState('');

  // Custom confirm dialog state
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmColor: '',
    onConfirm: () => {}
  });

  // Data States
  const [users, setUsers] = useState([]);
  const [places, setPlaces] = useState([]);
  const [parties, setParties] = useState([]);
  const [varieties, setVarieties] = useState([]);

  // Modal States
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showVarietyModal, setShowVarietyModal] = useState(false);

  // Edit Tracking IDs
  const [editUserId, setEditUserId] = useState(null);
  const [editPlaceId, setEditPlaceId] = useState(null);
  const [editPartyId, setEditPartyId] = useState(null);
  const [editVarietyId, setEditVarietyId] = useState(null);

  // Form States
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'STAFF' });
  const [placeForm, setPlaceForm] = useState({ name: '' });
  const [partyForm, setPartyForm] = useState({ name: '', shortcut_name: '', phone_number: '', place: '' });
  const [varietyForm, setVarietyForm] = useState({ name: '', kgs_per_bag: '', photo: null });

  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeSection) {
      setCurrentMasterTab(activeSection);
    }
  }, [activeSection]);

  const loadAllData = async () => {
    loadUsers();
    loadPlaces();
    loadParties();
    loadVarieties();
  };

  const loadUsers = () => getUsers().then(res => setUsers(res.results || res.data || res)).catch(console.error);
  const loadPlaces = () => getPlaces().then(res => setPlaces(res.results || res.data || res)).catch(console.error);
  const loadParties = () => getParties().then(res => setParties(res.results || res.data || res)).catch(console.error);
  const loadVarieties = () => getVarieties().then(res => setVarieties(res.results || res.data || res)).catch(console.error);

  // --- Reset forms ---
  const closeUserModal = () => {
    setShowUserModal(false);
    setEditUserId(null);
    setUserForm({ username: '', password: '', role: 'STAFF' });
  };
  const closePlaceModal = () => {
    setShowPlaceModal(false);
    setEditPlaceId(null);
    setPlaceForm({ name: '' });
  };
  const closePartyModal = () => {
    setShowPartyModal(false);
    setEditPartyId(null);
    setPartyForm({ name: '', shortcut_name: '', phone_number: '', place: '' });
    setPhoneError('');
  };
  const closeVarietyModal = () => {
    setShowVarietyModal(false);
    setEditVarietyId(null);
    setVarietyForm({ name: '', kgs_per_bag: '', photo: null });
  };

  // --- Handlers: User ---
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUserId) {
        const payload = { username: userForm.username, role: userForm.role };
        if (userForm.password) payload.password = userForm.password;
        await updateUser(editUserId, payload);
      } else {
        await createUser(userForm);
      }
      if (showToast) showToast(`User ${editUserId ? 'updated' : 'created'} successfully!`);
      closeUserModal();
      loadUsers();
    } catch (err) {
      if (showToast) showToast(err.message || 'Error saving user', 'error');
      else alert(err.message || 'Error saving user');
    }
  };

  const handleEditUserClick = (u) => {
    setEditUserId(u.id);
    setUserForm({ username: u.username, password: '', role: u.role });
    setShowUserModal(true);
  };

  const handleDeleteUser = (id) => {
    if (user?.role !== 'OWNER') {
      if (showToast) showToast('Only OWNER can delete user accounts!', 'error');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Delete User Account?',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmText: 'Delete User',
      confirmColor: '#dc2626',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await deleteUser(id);
          if (showToast) showToast('User deleted successfully!');
          loadUsers();
        } catch (err) {
          if (showToast) showToast(err.message || 'Cannot delete user', 'error');
        }
      }
    });
  };

  // --- Handlers: Place ---
  const handlePlaceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editPlaceId) {
        await updatePlace(editPlaceId, placeForm);
      } else {
        await createPlace(placeForm);
      }
      if (showToast) showToast(`Place ${editPlaceId ? 'updated' : 'created'} successfully!`);
      closePlaceModal();
      loadPlaces();
    } catch (err) {
      if (showToast) showToast(err.message || 'Error saving place', 'error');
    }
  };

  const handleEditPlaceClick = (p) => {
    setEditPlaceId(p.id);
    setPlaceForm({ name: p.name });
    setShowPlaceModal(true);
  };

  const handleDeletePlace = (id) => {
    if (user?.role !== 'OWNER') {
      if (showToast) showToast('Only OWNER can delete places!', 'error');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Delete Place?',
      message: 'Are you sure you want to delete this place?',
      confirmText: 'Delete Place',
      confirmColor: '#dc2626',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await deletePlace(id);
          if (showToast) showToast('Place deleted successfully!');
          loadPlaces();
        } catch (err) {
          if (showToast) showToast(err.message || 'Cannot delete place linked to parties!', 'error');
        }
      }
    });
  };

  // --- Handlers: Party ---
  const handlePartySubmit = async (e) => {
    e.preventDefault();
    if (partyForm.phone_number) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(partyForm.phone_number)) {
        setPhoneError('Phone number must be exactly 10 digits starting with 6, 7, 8, or 9');
        return;
      }
    }
    setPhoneError('');

    const payload = {
      name: partyForm.name,
      shortcut_name: partyForm.shortcut_name || null,
      phone_number: partyForm.phone_number || null,
      place: partyForm.place ? parseInt(partyForm.place, 10) : null
    };

    try {
      if (editPartyId) {
        await updateParty(editPartyId, payload);
      } else {
        await createParty(payload);
      }
      if (showToast) showToast(`Party ${editPartyId ? 'updated' : 'created'} successfully!`);
      closePartyModal();
      loadParties();
    } catch (err) {
      if (showToast) showToast(err.message || 'Error saving party', 'error');
    }
  };

  const handleEditPartyClick = (pt) => {
    setEditPartyId(pt.id);
    setPartyForm({
      name: pt.name,
      shortcut_name: pt.shortcut_name || '',
      phone_number: pt.phone_number || '',
      place: pt.place || ''
    });
    setShowPartyModal(true);
  };

  const handleDeleteParty = (id) => {
    if (user?.role !== 'OWNER') {
      if (showToast) showToast('Only OWNER can delete parties!', 'error');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Delete Party?',
      message: 'Are you sure you want to delete this party?',
      confirmText: 'Delete Party',
      confirmColor: '#dc2626',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await deleteParty(id);
          if (showToast) showToast('Party deleted successfully!');
          loadParties();
        } catch (err) {
          if (showToast) showToast(err.message || 'Cannot delete party linked to transactions!', 'error');
        }
      }
    });
  };

  // --- Handlers: Variety ---
  const handleVarietySubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', varietyForm.name);
      formData.append('kgs_per_bag', varietyForm.kgs_per_bag);
      if (varietyForm.photo) {
        formData.append('photo', varietyForm.photo);
      }

      if (editVarietyId) {
        await updateVariety(editVarietyId, formData);
      } else {
        await createVariety(formData);
      }
      if (showToast) showToast(`Variety ${editVarietyId ? 'updated' : 'created'} successfully!`);
      closeVarietyModal();
      loadVarieties();
    } catch (err) {
      if (showToast) showToast(err.message || 'Error saving variety', 'error');
    }
  };

  const handleEditVarietyClick = (v) => {
    setEditVarietyId(v.id);
    setVarietyForm({
      name: v.name,
      kgs_per_bag: v.kgs_per_bag,
      photo: null
    });
    setShowVarietyModal(true);
  };

  const handleDeleteVariety = (id) => {
    if (user?.role !== 'OWNER') {
      if (showToast) showToast('Only OWNER can delete varieties!', 'error');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Delete Variety?',
      message: 'Are you sure you want to delete this variety?',
      confirmText: 'Delete Variety',
      confirmColor: '#dc2626',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await deleteVariety(id);
          if (showToast) showToast('Variety deleted successfully!');
          loadVarieties();
        } catch (err) {
          if (showToast) showToast(err.message || 'Cannot delete variety linked to stock transactions!', 'error');
        }
      }
    });
  };

  // Filtered lists
  const q = searchTerm.toLowerCase().trim();
  const filteredParties = parties.filter(p => 
    !q || p.name?.toLowerCase().includes(q) || p.shortcut_name?.toLowerCase().includes(q) || p.phone_number?.includes(q) || p.place_name?.toLowerCase().includes(q)
  );
  const filteredVarieties = varieties.filter(v => 
    !q || v.name?.toLowerCase().includes(q) || String(v.kgs_per_bag).includes(q)
  );
  const filteredPlaces = places.filter(p => 
    !q || p.name?.toLowerCase().includes(q)
  );
  const filteredUsers = users.filter(u => 
    !q || u.username?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)
  );

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Header & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-sliders" style={{ color: '#2563eb' }}></i> Master Records Management
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>
            Configure and maintain core database masters for Parties, Varieties, Branches, and System Users.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }}></i>
            <input 
              type="text" 
              className="input" 
              placeholder={`Search ${currentMasterTab}...`} 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ paddingLeft: '2rem', width: '220px', fontSize: '0.82rem' }}
            />
          </div>
          {searchTerm && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSearchTerm('')}>Clear</button>
          )}
        </div>
      </div>

      {/* SEGMENTED TAB BUTTONS BAR */}
      <div className="master-tabs-bar">
        <button 
          className={`master-tab-btn ${currentMasterTab === 'party' ? 'active' : ''}`} 
          onClick={() => { setCurrentMasterTab('party'); setSearchTerm(''); }}
        >
          <i className="fas fa-address-book" style={{ color: currentMasterTab === 'party' ? '#2563eb' : '#64748b' }}></i>
          <span>Party Master</span>
          <span className="tab-badge">{parties.length}</span>
        </button>

        <button 
          className={`master-tab-btn ${currentMasterTab === 'variety' ? 'active' : ''}`} 
          onClick={() => { setCurrentMasterTab('variety'); setSearchTerm(''); }}
        >
          <i className="fas fa-wheat-awn" style={{ color: currentMasterTab === 'variety' ? '#10b981' : '#64748b' }}></i>
          <span>Variety Master</span>
          <span className="tab-badge">{varieties.length}</span>
        </button>

        <button 
          className={`master-tab-btn ${currentMasterTab === 'place' ? 'active' : ''}`} 
          onClick={() => { setCurrentMasterTab('place'); setSearchTerm(''); }}
        >
          <i className="fas fa-warehouse" style={{ color: currentMasterTab === 'place' ? '#f59e0b' : '#64748b' }}></i>
          <span>Place / Branch</span>
          <span className="tab-badge">{places.length}</span>
        </button>

        <button 
          className={`master-tab-btn ${currentMasterTab === 'user' ? 'active' : ''}`} 
          onClick={() => { setCurrentMasterTab('user'); setSearchTerm(''); }}
        >
          <i className="fas fa-user-gear" style={{ color: currentMasterTab === 'user' ? '#8b5cf6' : '#64748b' }}></i>
          <span>User Accounts</span>
          <span className="tab-badge">{users.length}</span>
        </button>
      </div>

      {/* TAB 1: PARTY MASTER */}
      {currentMasterTab === 'party' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">
              <i className="fas fa-address-book" style={{ color: '#2563eb' }}></i> Parties &amp; Suppliers ({filteredParties.length})
            </div>
            <button className="btn btn-blue" onClick={() => setShowPartyModal(true)}>
              <i className="fas fa-plus"></i> Add New Party
            </button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%', textAlign: 'center' }}>SL</th>
                  <th style={{ width: '30%' }}>Party / Supplier Name</th>
                  <th style={{ width: '15%' }}>Shortcut</th>
                  <th style={{ width: '20%' }}>Phone Number</th>
                  <th style={{ width: '18%' }}>Place / City</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParties.map((pt, idx) => (
                  <tr key={pt.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{pt.name}</td>
                    <td style={{ fontWeight: 600, color: '#475569' }}>{pt.shortcut_name || '-'}</td>
                    <td style={{ color: '#334155' }}>{pt.phone_number || '-'}</td>
                    <td style={{ color: '#334155' }}>{pt.place_name || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => handleEditPartyClick(pt)}>
                          <i className="fas fa-pen-to-square" style={{ color: '#2563eb' }}></i> Edit
                        </button>
                        {pt.can_delete && user?.role === 'OWNER' ? (
                          <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDeleteParty(pt.id)}>
                            <i className="fas fa-trash" style={{ color: '#ef4444' }}></i>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '0.2rem' }}>
                            <i className="fas fa-lock" style={{ marginRight: '2px' }}></i> Active
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredParties.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>No parties found matching criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VARIETY MASTER */}
      {currentMasterTab === 'variety' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">
              <i className="fas fa-wheat-awn" style={{ color: '#10b981' }}></i> Variety Master ({filteredVarieties.length})
            </div>
            <button className="btn btn-green" onClick={() => setShowVarietyModal(true)}>
              <i className="fas fa-plus"></i> Add New Variety
            </button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%', textAlign: 'center' }}>SL</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Photo</th>
                  <th style={{ width: '37%' }}>Variety Name</th>
                  <th style={{ width: '20%' }}>Standard Weight (Kg/Bag)</th>
                  <th style={{ width: '18%' }}>Stock Position</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVarieties.map((v, idx) => (
                  <tr key={v.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ textAlign: 'center' }}>
                      {v.photo ? (
                        <img src={v.photo} alt={v.name} className="thumb" />
                      ) : (
                        <div className="thumb" style={{ background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fas fa-image" style={{ color: '#cbd5e1' }}></i>
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{v.name}</td>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{v.kgs_per_bag} kg</td>
                    <td style={{ fontWeight: 700, color: (v.current_stock_bags || 0) < 2000 ? '#ef4444' : '#059669' }}>
                      {(v.current_stock_bags || 0).toLocaleString()} Bags
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => handleEditVarietyClick(v)}>
                          <i className="fas fa-pen-to-square" style={{ color: '#2563eb' }}></i> Edit
                        </button>
                        {v.can_delete && user?.role === 'OWNER' ? (
                          <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDeleteVariety(v.id)}>
                            <i className="fas fa-trash" style={{ color: '#ef4444' }}></i>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '0.2rem' }}>
                            <i className="fas fa-lock" style={{ marginRight: '2px' }}></i> Active
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVarieties.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>No varieties found matching criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PLACE MASTER */}
      {currentMasterTab === 'place' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">
              <i className="fas fa-warehouse" style={{ color: '#f59e0b' }}></i> Place / Branch Master ({filteredPlaces.length})
            </div>
            <button className="btn btn-blue" onClick={() => setShowPlaceModal(true)}>
              <i className="fas fa-plus"></i> Add New Place
            </button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '8%', textAlign: 'center' }}>SL</th>
                  <th style={{ width: '72%' }}>Place / Branch Location Name</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlaces.map((p, idx) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => handleEditPlaceClick(p)}>
                          <i className="fas fa-pen-to-square" style={{ color: '#2563eb' }}></i> Edit
                        </button>
                        {p.can_delete && user?.role === 'OWNER' ? (
                          <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDeletePlace(p.id)}>
                            <i className="fas fa-trash" style={{ color: '#ef4444' }}></i>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '0.2rem' }}>
                            <i className="fas fa-lock" style={{ marginRight: '2px' }}></i> Active
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPlaces.length === 0 && (
                  <tr><td colSpan="3" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>No places found matching criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USER MANAGEMENT */}
      {currentMasterTab === 'user' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">
              <i className="fas fa-user-gear" style={{ color: '#8b5cf6' }}></i> User Accounts ({filteredUsers.length})
            </div>
            <button className="btn btn-blue" onClick={() => setShowUserModal(true)}>
              <i className="fas fa-plus"></i> Add New User
            </button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '8%', textAlign: 'center' }}>SL</th>
                  <th style={{ width: '42%' }}>Username</th>
                  <th style={{ width: '30%' }}>Access Role</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{u.username}</td>
                    <td>
                      <span className={`role-pill ${u.role === 'OWNER' ? 'role-owner' : 'role-staff'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => handleEditUserClick(u)}>
                          <i className="fas fa-pen-to-square" style={{ color: '#2563eb' }}></i> Edit
                        </button>
                        {u.can_delete && user?.role === 'OWNER' ? (
                          <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDeleteUser(u.id)}>
                            <i className="fas fa-trash" style={{ color: '#ef4444' }}></i>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '0.2rem' }}>
                            <i className="fas fa-lock" style={{ marginRight: '2px' }}></i> Active
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>No users found matching criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: USER */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-hdr">
              <div className="modal-title">
                <i className={editUserId ? "fas fa-user-pen" : "fas fa-user-plus"} style={{ color: '#8b5cf6' }}></i> 
                {editUserId ? "Edit User Details" : "Add New User Account"}
              </div>
              <button className="modal-close" onClick={closeUserModal}>&times;</button>
            </div>
            <form onSubmit={handleUserSubmit}>
              <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                <label>Username</label>
                <input type="text" className="input" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} required placeholder="Enter username" />
              </div>
              <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                <label>Password {editUserId && <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'none' }}>(Leave blank to keep unchanged)</span>}</label>
                <input type="password" className="input" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required={!editUserId} placeholder="Enter password" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Role Authority</label>
                <select className="input" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="STAFF">Staff (Entry &amp; Approval Requests)</option>
                  <option value="OWNER">Owner (Full Direct Authority)</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeUserModal}>Cancel</button>
                <button type="submit" className="btn btn-blue">
                  <i className="fas fa-save"></i> {editUserId ? "Update User" : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PLACE */}
      {showPlaceModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-hdr">
              <div className="modal-title">
                <i className="fas fa-warehouse" style={{ color: '#f59e0b' }}></i> {editPlaceId ? "Edit Place Details" : "Add New Place / Branch"}
              </div>
              <button className="modal-close" onClick={closePlaceModal}>&times;</button>
            </div>
            <form onSubmit={handlePlaceSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Place Name</label>
                <input type="text" className="input" value={placeForm.name} onChange={e => setPlaceForm({ name: e.target.value })} required placeholder="e.g. Raichur Branch" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closePlaceModal}>Cancel</button>
                <button type="submit" className="btn btn-blue">
                  <i className="fas fa-save"></i> {editPlaceId ? "Update Place" : "Save Place"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PARTY */}
      {showPartyModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-hdr">
              <div className="modal-title">
                <i className="fas fa-address-book" style={{ color: '#2563eb' }}></i> {editPartyId ? "Edit Party Details" : "Add New Party / Supplier"}
              </div>
              <button className="modal-close" onClick={closePartyModal}>&times;</button>
            </div>
            <form onSubmit={handlePartySubmit}>
              <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                <label>Party / Company Name</label>
                <input type="text" className="input" value={partyForm.name} onChange={e => setPartyForm({ ...partyForm, name: e.target.value })} required placeholder="e.g. Sri Laxmi Rice Traders" />
              </div>
              <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                <label>Shortcut Name (Optional)</label>
                <input type="text" className="input" value={partyForm.shortcut_name} onChange={e => setPartyForm({ ...partyForm, shortcut_name: e.target.value })} placeholder="e.g. SLRT" />
              </div>
              <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                <label>Phone Number (10 Digits)</label>
                <input type="text" className="input" maxLength={10} value={partyForm.phone_number} onChange={e => { setPartyForm({ ...partyForm, phone_number: e.target.value }); setPhoneError(''); }} placeholder="e.g. 9876543210" />
                {phoneError && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem' }}>{phoneError}</span>}
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Place Location</label>
                <select className="input" value={partyForm.place} onChange={e => setPartyForm({ ...partyForm, place: e.target.value })}>
                  <option value="">Select Place</option>
                  {places.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closePartyModal}>Cancel</button>
                <button type="submit" className="btn btn-blue">
                  <i className="fas fa-save"></i> {editPartyId ? "Update Party" : "Save Party"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VARIETY */}
      {showVarietyModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-hdr">
              <div className="modal-title">
                <i className="fas fa-wheat-awn" style={{ color: '#10b981' }}></i> {editVarietyId ? "Edit Variety Details" : "Add New Bag Variety"}
              </div>
              <button className="modal-close" onClick={closeVarietyModal}>&times;</button>
            </div>
            <form onSubmit={handleVarietySubmit}>
              <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                <label>Variety Name</label>
                <input type="text" className="input" value={varietyForm.name} onChange={e => setVarietyForm({ ...varietyForm, name: e.target.value })} required placeholder="e.g. Sona Masoori Raw 50kg" />
              </div>
              <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                <label>Standard Kgs Per Bag</label>
                <input type="number" step="0.01" className="input" value={varietyForm.kgs_per_bag} onChange={e => setVarietyForm({ ...varietyForm, kgs_per_bag: e.target.value })} required placeholder="50.00" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Variety Photo {editVarietyId ? <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'none' }}>(Leave empty to keep current)</span> : <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'none' }}>(Optional)</span>}</label>
                <input type="file" accept="image/*" className="input" onChange={e => setVarietyForm({ ...varietyForm, photo: e.target.files[0] })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeVarietyModal}>Cancel</button>
                <button type="submit" className="btn btn-green">
                  <i className="fas fa-save"></i> {editVarietyId ? "Update Variety" : "Save Variety"}
                </button>
              </div>
            </form>
          </div>
        </div>
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

export default MasterCreation;
