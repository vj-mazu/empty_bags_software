import React, { useState, useEffect } from 'react';
import { 
  getUsers, createUser, updateUser, deleteUser,
  getPlaces, createPlace, updatePlace, deletePlace,
  getParties, createParty, updateParty, deleteParty,
  getVarieties, createVariety, updateVariety, deleteVariety
} from '../api';
import CustomConfirmModal from './CustomConfirmModal';

const MasterCreation = ({ user, activeSection, showToast }) => {
  // Master Tab filter: 'party' | 'variety' | 'place' | 'user'
  const [currentMasterTab, setCurrentMasterTab] = useState(activeSection || 'party');

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

  // Edit Tracking PIDs
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
        // Update user
        const payload = { username: userForm.username, role: userForm.role };
        if (userForm.password) payload.password = userForm.password;
        await updateUser(editUserId, payload);
      } else {
        // Create user
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
      else alert('Only OWNER can delete user accounts!');
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
          else alert(err.message || 'Cannot delete user');
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
      else alert(err.message || 'Error saving place');
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
      else alert('Only OWNER can delete places!');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Delete Place Master?',
      message: 'Are you sure you want to delete this place? This will error if it is linked to active parties.',
      confirmText: 'Delete Place',
      confirmColor: '#dc2626',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await deletePlace(id);
          if (showToast) showToast('Place deleted successfully!');
          loadPlaces();
        } catch (err) {
          if (showToast) showToast(err.message || 'Cannot delete place linked to existing parties!', 'error');
          else alert(err.message || 'Cannot delete place linked to existing parties!');
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
      else alert(err.message || 'Error saving party');
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
      else alert('Only OWNER can delete parties!');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Delete Party Master?',
      message: 'Are you sure you want to delete this party? This will error if they have existing invoices.',
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
          else alert(err.message || 'Cannot delete party linked to transactions!');
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
      else alert(err.message || 'Error saving variety');
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
      else alert('Only OWNER can delete varieties!');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Delete Variety Master?',
      message: 'Are you sure you want to delete this variety? This will fail if it has active bags or ledger records.',
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
          else alert(err.message || 'Cannot delete variety linked to stock transactions!');
        }
      }
    });
  };

  const showUser = currentMasterTab === 'user';
  const showPlace = currentMasterTab === 'place';
  const showParty = currentMasterTab === 'party';
  const showVariety = currentMasterTab === 'variety';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="card-hdr" style={{ marginBottom: '1.25rem' }}>
        <h2 className="card-title" style={{ fontSize: '1.2rem' }}>
          <i className="fas fa-sliders" style={{ color: '#2563eb' }}></i> Master Creation Management
        </h2>
      </div>

      {/* SUB TABS FILTER BUTTONS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className={`btn ${currentMasterTab === 'party' ? 'btn-blue' : 'btn-ghost'}`} onClick={() => setCurrentMasterTab('party')}>
          <i className="fas fa-address-book"></i> Party Master ({parties.length})
        </button>
        <button className={`btn ${currentMasterTab === 'variety' ? 'btn-blue' : 'btn-ghost'}`} onClick={() => setCurrentMasterTab('variety')}>
          <i className="fas fa-wheat-awn"></i> Variety Master ({varieties.length})
        </button>
        <button className={`btn ${currentMasterTab === 'place' ? 'btn-blue' : 'btn-ghost'}`} onClick={() => setCurrentMasterTab('place')}>
          <i className="fas fa-warehouse"></i> Place Master ({places.length})
        </button>
        <button className={`btn ${currentMasterTab === 'user' ? 'btn-blue' : 'btn-ghost'}`} onClick={() => setCurrentMasterTab('user')}>
          <i className="fas fa-user-gear"></i> User Management ({users.length})
        </button>
      </div>

      <div>
        
        {/* SECTION 1: User Management */}
        {showUser && (
          <div className="card" id="section-user">
            <div className="card-hdr">
              <div className="card-title"><i className="fas fa-user-gear"></i> User Management</div>
              <button className="btn btn-blue btn-sm" onClick={() => setShowUserModal(true)}>
                <i className="fas fa-plus"></i> Add User
              </button>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.username}</td>
                      <td><span className={`role-pill ${u.role === 'OWNER' ? 'role-owner' : 'role-staff'}`}>{u.role}</span></td>
                      <td style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-blue btn-sm" onClick={() => handleEditUserClick(u)}>
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        {u.can_delete && user?.role === 'OWNER' ? (
                          <button className="btn btn-red btn-sm" onClick={() => handleDeleteUser(u.id)}>
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        ) : (
                          u.can_delete ? null : <span className="text-muted" style={{ fontSize: '0.72rem', alignSelf: 'center' }}><i className="fas fa-lock"></i> Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center' }}>No users registered.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: Place Master */}
        {showPlace && (
          <div className="card" id="section-place">
            <div className="card-hdr">
              <div className="card-title"><i className="fas fa-warehouse"></i> Place Master</div>
              <button className="btn btn-blue btn-sm" onClick={() => setShowPlaceModal(true)}>
                <i className="fas fa-plus"></i> Add Place
              </button>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Place Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-blue btn-sm" onClick={() => handleEditPlaceClick(p)}>
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        {p.can_delete && user?.role === 'OWNER' ? (
                          <button className="btn btn-red btn-sm" onClick={() => handleDeletePlace(p.id)}>
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        ) : (
                          p.can_delete ? null : <span className="text-muted" style={{ fontSize: '0.72rem', alignSelf: 'center' }}><i className="fas fa-lock"></i> Linked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {places.length === 0 && <tr><td colSpan="2" style={{ textAlign: 'center' }}>No places created.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3: Party Master */}
        {showParty && (
          <div className="card full-width" id="section-party">
            <div className="card-hdr">
              <div className="card-title"><i className="fas fa-address-book"></i> Party Master</div>
              <button className="btn btn-blue btn-sm" onClick={() => setShowPartyModal(true)}>
                <i className="fas fa-plus"></i> Add Party
              </button>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Party Name</th>
                    <th>Shortcut</th>
                    <th>Phone Number</th>
                    <th>Place</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.map(pt => (
                    <tr key={pt.id}>
                      <td style={{ fontWeight: 700 }}>{pt.name}</td>
                      <td>{pt.shortcut_name || '-'}</td>
                      <td>{pt.phone_number || '-'}</td>
                      <td>{pt.place_name || '-'}</td>
                      <td style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-blue btn-sm" onClick={() => handleEditPartyClick(pt)}>
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        {pt.can_delete && user?.role === 'OWNER' ? (
                          <button className="btn btn-red btn-sm" onClick={() => handleDeleteParty(pt.id)}>
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        ) : (
                          pt.can_delete ? null : <span className="text-muted" style={{ fontSize: '0.72rem', alignSelf: 'center' }}><i className="fas fa-lock"></i> Linked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {parties.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>No parties created.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 4: Variety Master */}
        {showVariety && (
          <div className="card full-width" id="section-variety">
            <div className="card-hdr">
              <div className="card-title"><i className="fas fa-wheat-awn"></i> Variety Master</div>
              <button className="btn btn-blue btn-sm" onClick={() => setShowVarietyModal(true)}>
                <i className="fas fa-plus"></i> Add Variety
              </button>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Variety Name</th>
                    <th>Standard Kg / Bag</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {varieties.map(v => (
                    <tr key={v.id}>
                      <td>
                        {v.photo ? <img src={v.photo} alt={v.name} className="thumb" /> : <div className="thumb" style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-image" style={{ color: '#94a3b8' }}></i></div>}
                      </td>
                      <td style={{ fontWeight: 700 }}>{v.name}</td>
                      <td style={{ fontWeight: 600 }}>{v.kgs_per_bag} kg</td>
                      <td style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-blue btn-sm" onClick={() => handleEditVarietyClick(v)}>
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        {v.can_delete && user?.role === 'OWNER' ? (
                          <button className="btn btn-red btn-sm" onClick={() => handleDeleteVariety(v.id)}>
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        ) : (
                          v.can_delete ? null : <span className="text-muted" style={{ fontSize: '0.72rem', alignSelf: 'center' }}><i className="fas fa-lock"></i> Linked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {varieties.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center' }}>No varieties created.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: USER */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-hdr">
              <div className="modal-title">
                <i className={editUserId ? "fas fa-user-pen" : "fas fa-user-plus"}></i> {editUserId ? "Edit User Details" : "Add New User"}
              </div>
              <button className="modal-close" onClick={closeUserModal}>&times;</button>
            </div>
            <form onSubmit={handleUserSubmit}>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label>Username</label>
                <input type="text" className="input" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} required />
              </div>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label>Password {editUserId && <span style={{ color: '#64748b', fontSize: '0.72rem' }}>(Leave blank to keep current)</span>}</label>
                <input type="password" className="input" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required={!editUserId} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Role</label>
                <select className="input" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="STAFF">Staff (Entry Only)</option>
                  <option value="OWNER">Owner (Full Authority)</option>
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
                <i className="fas fa-warehouse"></i> {editPlaceId ? "Edit Place Details" : "Add New Place"}
              </div>
              <button className="modal-close" onClick={closePlaceModal}>&times;</button>
            </div>
            <form onSubmit={handlePlaceSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Place Name</label>
                <input type="text" className="input" value={placeForm.name} onChange={e => setPlaceForm({ name: e.target.value })} required placeholder="e.g. Vijayawada" />
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
                <i className="fas fa-address-book"></i> {editPartyId ? "Edit Party Details" : "Add New Party"}
              </div>
              <button className="modal-close" onClick={closePartyModal}>&times;</button>
            </div>
            <form onSubmit={handlePartySubmit}>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label>Party Name</label>
                <input type="text" className="input" value={partyForm.name} onChange={e => setPartyForm({ ...partyForm, name: e.target.value })} required placeholder="e.g. Sri Laxmi Rice Traders" />
              </div>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label>Shortcut Name</label>
                <input type="text" className="input" value={partyForm.shortcut_name} onChange={e => setPartyForm({ ...partyForm, shortcut_name: e.target.value })} placeholder="e.g. SLRT" />
              </div>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label>Phone Number (10 Digits)</label>
                <input type="text" className="input" maxLength={10} value={partyForm.phone_number} onChange={e => { setPartyForm({ ...partyForm, phone_number: e.target.value }); setPhoneError(''); }} placeholder="e.g. 9876543210" />
                {phoneError && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem' }}>{phoneError}</span>}
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Place</label>
                <select className="input" value={partyForm.place} onChange={e => setPartyForm({ ...partyForm, place: e.target.value })}>
                  <option value="">-- Select Place --</option>
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
                <i className="fas fa-wheat-awn"></i> {editVarietyId ? "Edit Variety Details" : "Add New Variety"}
              </div>
              <button className="modal-close" onClick={closeVarietyModal}>&times;</button>
            </div>
            <form onSubmit={handleVarietySubmit}>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label>Variety Name</label>
                <input type="text" className="input" value={varietyForm.name} onChange={e => setVarietyForm({ ...varietyForm, name: e.target.value })} required placeholder="e.g. Sona Masoori Raw 50kg" />
              </div>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label>Standard Kgs Per Bag</label>
                <input type="number" step="0.01" className="input" value={varietyForm.kgs_per_bag} onChange={e => setVarietyForm({ ...varietyForm, kgs_per_bag: e.target.value })} required placeholder="50.00" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Photo {editVarietyId ? <span style={{ color: '#64748b', fontSize: '0.72rem' }}>(Leave empty to keep current)</span> : <span style={{ color: '#64748b', fontSize: '0.72rem' }}>(Optional)</span>}</label>
                <input type="file" accept="image/*" className="input" onChange={e => setVarietyForm({ ...varietyForm, photo: e.target.files[0] })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeVarietyModal}>Cancel</button>
                <button type="submit" className="btn btn-blue">
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
