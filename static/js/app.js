// Mother India Mill Core Software Engine

let currentUser = 'staff1';
let currentRole = 'STAFF';

let masterParties = [];
let masterVarieties = [];
let masterPlaces = [];
let activeAlerts = [];

document.addEventListener('DOMContentLoaded', () => {
  setTodayDates();
  loadAllMasterData();
  loadDashboardStats();
  loadAlerts();
  loadInwardEntries();
  loadOutwardEntries();
  loadEmptyBagsLedger();
  loadStocksTab();
});

function setTodayDates() {
  const today = new Date().toISOString().split('T')[0];
  const inDate = document.getElementById('inwardDate');
  const outDate = document.getElementById('outwardDate');
  if (inDate) inDate.value = today;
  if (outDate) outDate.value = today;
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(sec => sec.style.display = 'none');

  const targetSection = document.getElementById(`tab-${tabId}`);
  if (targetSection) targetSection.style.display = 'block';

  if (tabId === 'dashboard') loadDashboardStats();
  if (tabId === 'emptybags') loadEmptyBagsLedger();
  if (tabId === 'stocks') loadStocksTab();
  if (tabId === 'masters') renderMasterTables();
}

function openMasterModal(type) {
  switchTab('masters');
  if (type === 'user') openModal('userModal');
  if (type === 'party') openModal('partyModal');
  if (type === 'variety') openModal('varietyModal');
  if (type === 'place') openModal('placeModal');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function openLoginModal() { openModal('loginModal'); }

async function performLogin(e) {
  e.preventDefault();
  const u = document.getElementById('loginUsername').value;
  const p = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username: u, password: p})
    });
    const data = await res.json();

    if (res.ok) {
      currentUser = data.username;
      currentRole = data.role;
      updateUserUI();
      closeModal('loginModal');
      alert(`Welcome ${currentUser}! Logged in as ${currentRole}.`);
      loadAlerts();
    } else {
      alert(data.error || 'Login failed!');
    }
  } catch (err) {
    alert('Server connection error!');
  }
}

function updateUserUI() {
  document.getElementById('activeUserLabel').textContent = currentUser;
  const badge = document.getElementById('activeRoleBadge');
  badge.textContent = currentRole;
  badge.className = `role-pill ${currentRole === 'OWNER' ? 'role-owner' : 'role-staff'}`;
}

// SYSTEM ALERTS & BELL ICON
async function loadAlerts() {
  const badge = document.getElementById('alertBadgeCount');
  const modalList = document.getElementById('modalAlertsList');
  if (modalList) modalList.innerHTML = '';

  try {
    const res = await fetch('/api/alerts/');
    const data = await res.json();

    activeAlerts = [];
    if (data.low_stock_alerts) activeAlerts.push(...data.low_stock_alerts);
    if (data.aging_stock_alerts) activeAlerts.push(...data.aging_stock_alerts);

    if (activeAlerts.length > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = activeAlerts.length;
    } else {
      badge.style.display = 'none';
    }

    if (modalList) {
      if (activeAlerts.length === 0) {
        modalList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 1rem;">No active alerts. Stock levels are healthy!</div>';
      } else {
        modalList.innerHTML = activeAlerts.map(a => `
          <div style="padding: 0.75rem; background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; border-radius: 6px; font-size: 0.88rem; font-weight: 600;">
            <i class="fa-solid fa-triangle-exclamation"></i> ${a.message}
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed loading alerts:', err);
  }
}

function toggleAlertsModal() {
  openModal('alertsModal');
}

// MASTER DATA
async function loadAllMasterData() {
  try {
    const [pRes, vRes, plRes] = await Promise.all([
      fetch('/api/parties/'),
      fetch('/api/varieties/'),
      fetch('/api/places/')
    ]);

    masterParties = await pRes.json();
    masterVarieties = await vRes.json();
    masterPlaces = await plRes.json();

    populateDropdowns();
  } catch (err) {
    console.error('Error fetching master data:', err);
  }
}

function populateDropdowns() {
  const inPartySelect = document.getElementById('inwardParty');
  const outPartySelect = document.getElementById('outwardParty');
  const partyPlaceSelect = document.getElementById('newPartyPlace');

  let pOptions = '<option value="">-- Select Party --</option>';
  masterParties.forEach(p => {
    pOptions += `<option value="${p.id}">${p.name} ${p.shortcut_name ? '(' + p.shortcut_name + ')' : ''}</option>`;
  });

  if (inPartySelect) inPartySelect.innerHTML = pOptions;
  if (outPartySelect) outPartySelect.innerHTML = pOptions;

  const inVarSelect = document.getElementById('inwardVariety');
  const outVarSelect = document.getElementById('outwardVariety');

  let vOptions = '<option value="">-- Select Variety --</option>';
  masterVarieties.forEach(v => {
    vOptions += `<option value="${v.id}">${v.name} (${v.kgs_per_bag} kg/bag)</option>`;
  });

  if (inVarSelect) inVarSelect.innerHTML = vOptions;
  if (outVarSelect) outVarSelect.innerHTML = vOptions;

  let plOptions = '<option value="">-- Select Place (Optional) --</option>';
  masterPlaces.forEach(pl => {
    plOptions += `<option value="${pl.id}">${pl.name}</option>`;
  });
  if (partyPlaceSelect) partyPlaceSelect.innerHTML = plOptions;
}

function updateInwardCalcs() {
  const bags = parseFloat(document.getElementById('inwardBags').value) || 0;
  const rate = parseFloat(document.getElementById('inwardRate').value) || 0;
  const lf = document.getElementById('inwardLfToggle').checked;

  let total = bags * rate;
  if (lf) total += (bags * 2.50);

  document.getElementById('inwardTotalVal').value = `Rs. ${total.toFixed(2)}`;
}

async function submitInwardForm(e) {
  e.preventDefault();
  const payload = {
    date: document.getElementById('inwardDate').value,
    party: document.getElementById('inwardParty').value,
    variety: document.getElementById('inwardVariety').value,
    bags: parseInt(document.getElementById('inwardBags').value),
    rate: parseFloat(document.getElementById('inwardRate').value),
    lf_toggle: document.getElementById('inwardLfToggle').checked
  };

  try {
    const res = await fetch('/api/inward/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      alert(`Inward Entry Saved! Invoice No: ${data.invoice_no}`);
      closeModal('inwardModal');
      document.getElementById('inwardForm').reset();
      setTodayDates();
      loadInwardEntries();
      loadDashboardStats();
      loadAlerts();
    } else {
      alert('Error saving inward: ' + JSON.stringify(data));
    }
  } catch (err) {
    alert('Server error saving inward entry!');
  }
}

function updateOutwardCalcs() {
  const bags = parseFloat(document.getElementById('outwardBags').value) || 0;
  const rate = parseFloat(document.getElementById('outwardRate').value) || 0;
  const lf = document.getElementById('outwardLfToggle').checked;

  let total = bags * rate;
  if (lf) total += (bags * 2.50);
  document.getElementById('outwardTotalVal').value = `Rs. ${total.toFixed(2)}`;
}

async function submitOutwardForm(e) {
  e.preventDefault();
  const payload = {
    date: document.getElementById('outwardDate').value,
    party: document.getElementById('outwardParty').value,
    variety: document.getElementById('outwardVariety').value,
    bags: parseInt(document.getElementById('outwardBags').value),
    rate: parseFloat(document.getElementById('outwardRate').value),
    lf_toggle: document.getElementById('outwardLfToggle').checked
  };

  try {
    const res = await fetch('/api/outward/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      alert(`Outward Entry Created! Invoice No: ${data.invoice_no}`);
      closeModal('outwardModal');
      document.getElementById('outwardForm').reset();
      setTodayDates();
      loadOutwardEntries();
      loadDashboardStats();
      loadAlerts();
    } else {
      if (data.bags) alert('STOCK ERROR: ' + data.bags[0]);
      else alert('Error saving outward: ' + JSON.stringify(data));
    }
  } catch (err) {
    alert('Server error saving outward entry!');
  }
}

// LOAD INWARD REGISTER (SL NO 1 FIRST - SORTED ASCENDING)
async function loadInwardEntries() {
  const tbody = document.getElementById('inwardRegisterTbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/inward/');
    const data = await res.json();
    let rows = data.results || data;

    // Sort SL No 1 first (ascending order)
    rows.sort((a, b) => a.sl_no - b.sl_no);

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No Inward entries.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td style="font-weight: 700;">#${r.sl_no}</td>
        <td style="font-weight: 700; color: var(--accent-emerald);">${r.invoice_no}</td>
        <td>${r.date}</td>
        <td>${r.party_name}</td>
        <td>${r.variety_name}</td>
        <td style="font-weight: 700;">${r.bags}</td>
        <td style="font-weight: 700; color: var(--primary);">Rs. ${r.total_value}</td>
        <td>
          <button class="btn-btn btn-secondary" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" onclick="downloadInvoicePDF('inward', ${r.id})">
            <i class="fa-solid fa-file-pdf"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" style="color: var(--accent-rose); text-align: center;">Error loading inwards.</td></tr>';
  }
}

// LOAD OUTWARD REGISTER (SL NO 1 FIRST - SORTED ASCENDING)
async function loadOutwardEntries() {
  const tbody = document.getElementById('outwardRegisterTbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/outward/');
    const data = await res.json();
    let rows = data.results || data;

    // Sort SL No 1 first
    rows.sort((a, b) => a.sl_no - b.sl_no);

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No Outward entries.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td style="font-weight: 700;">#${r.sl_no}</td>
        <td style="font-weight: 700; color: var(--primary);">${r.invoice_no}</td>
        <td>${r.date}</td>
        <td>${r.party_name}</td>
        <td>${r.variety_name}</td>
        <td style="font-weight: 700;">${r.bags}</td>
        <td style="font-weight: 700; color: var(--accent-emerald);">Rs. ${r.total_value}</td>
        <td>
          <button class="btn-btn btn-secondary" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" onclick="downloadInvoicePDF('outward', ${r.id})">
            <i class="fa-solid fa-file-pdf"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" style="color: var(--accent-rose); text-align: center;">Error loading outwards.</td></tr>';
  }
}

function downloadInvoicePDF(type, id) {
  window.open(`/api/${type}/${id}/pdf/`, '_blank');
}

async function loadEmptyBagsLedger() {
  const tbody = document.getElementById('emptyBagsTbody');
  try {
    const res = await fetch('/api/empty-bags-ledger/');
    const rows = await res.json();

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--text-muted);">No ledger movement recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((r, idx) => `
      <tr>
        <td>#${idx + 1}</td>
        <td style="font-weight: 700;">${r.variety_name}</td>
        <td>${r.date}</td>
        <td>${r.opening_bags}</td>
        <td>${r.opening_kgs.toFixed(2)} kg</td>
        <td style="color: var(--accent-emerald); font-weight: 700;">+${r.inward_bags}</td>
        <td>+${r.inward_kgs.toFixed(2)} kg</td>
        <td style="color: var(--accent-rose); font-weight: 700;">-${r.outward_bags}</td>
        <td>-${r.outward_kgs.toFixed(2)} kg</td>
        <td style="font-weight: 800; color: var(--primary);">${r.closing_bags}</td>
        <td style="font-weight: 700;">${r.closing_kgs.toFixed(2)} kg</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="11" style="color: var(--accent-rose); text-align: center;">Error loading empty bags stock ledger.</td></tr>';
  }
}

async function loadDashboardStats() {
  await loadStocksTab();
}

async function loadStocksTab() {
  const dashTbody = document.getElementById('dashboardStockTbody');
  const stocksTbody = document.getElementById('stocksTabTbody');

  try {
    const [vRes, inRes, outRes] = await Promise.all([
      fetch('/api/varieties/'),
      fetch('/api/inward/'),
      fetch('/api/outward/')
    ]);

    const varieties = await vRes.json();
    const inwards = (await inRes.json()).results || [];
    const outwards = (await outRes.json()).results || [];

    let totStockBags = 0;
    let totInBags = 0;
    let totOutBags = 0;
    let lowStockCnt = 0;

    inwards.forEach(i => totInBags += i.bags);
    outwards.forEach(o => totOutBags += o.bags);

    let html = '';
    varieties.forEach((v, idx) => {
      totStockBags += v.current_stock_bags;
      if (v.current_stock_bags < 2000) lowStockCnt++;

      const statusBadge = v.current_stock_bags < 2000 
        ? '<span class="role-pill role-owner">LOW STOCK (<2000)</span>' 
        : '<span class="role-pill role-staff">HEALTHY STOCK</span>';

      html += `
        <tr>
          <td>#${idx + 1}</td>
          <td><img src="${v.photo || 'https://via.placeholder.com/36?text=Bag'}" class="thumbnail-img"></td>
          <td style="font-weight: 700;">${v.name}</td>
          <td>${v.kgs_per_bag} kg</td>
          <td style="color: var(--accent-emerald); font-weight: 700;">+${v.current_stock_bags}</td>
          <td style="color: var(--accent-rose); font-weight: 700;">-0</td>
          <td style="font-weight: 800; font-size: 1rem; color: var(--primary);">${v.current_stock_bags} Bags</td>
          <td style="font-weight: 700;">${v.current_stock_kgs.toLocaleString()} kg</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    });

    if (dashTbody) dashTbody.innerHTML = html || '<tr><td colspan="6" style="text-align: center;">No varieties defined.</td></tr>';
    if (stocksTbody) stocksTbody.innerHTML = html || '<tr><td colspan="9" style="text-align: center;">No varieties defined.</td></tr>';

    document.getElementById('statTotalStockBags').textContent = totStockBags.toLocaleString();
    document.getElementById('statTodayInwardBags').textContent = totInBags.toLocaleString();
    document.getElementById('statTodayOutwardBags').textContent = totOutBags.toLocaleString();
    document.getElementById('statLowStockCount').textContent = lowStockCnt;

  } catch (err) {
    console.error('Failed loading stock position:', err);
  }
}

function renderMasterTables() {
  loadUsersTable();
  loadPlacesTable();
  loadPartiesTable();
  loadVarietiesTable();
}

async function loadUsersTable() {
  const tbody = document.getElementById('usersTbody');
  try {
    const res = await fetch('/api/users/');
    const users = await res.json();

    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="font-weight: 600;">${u.username}</td>
        <td><span class="role-pill ${u.role === 'OWNER' ? 'role-owner' : 'role-staff'}">${u.role}</span></td>
        <td>
          ${u.can_delete ? `<button class="btn-btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteMaster('users', ${u.id})"><i class="fa-solid fa-trash"></i> Delete</button>` : '<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-lock"></i> Locked</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="3">Error loading users.</td></tr>';
  }
}

async function loadPlacesTable() {
  const tbody = document.getElementById('placesTbody');
  try {
    const res = await fetch('/api/places/');
    const places = await res.json();

    tbody.innerHTML = places.map(p => `
      <tr>
        <td style="font-weight: 600;">${p.name}</td>
        <td>
          ${p.can_delete ? `<button class="btn-btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteMaster('places', ${p.id})"><i class="fa-solid fa-trash"></i> Delete</button>` : '<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-lock"></i> Locked</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="2">Error loading places.</td></tr>';
  }
}

async function loadPartiesTable() {
  const tbody = document.getElementById('partiesTbody');
  try {
    const res = await fetch('/api/parties/');
    const parties = await res.json();

    tbody.innerHTML = parties.map(pt => `
      <tr>
        <td style="font-weight: 700;">${pt.name}</td>
        <td>${pt.shortcut_name || '-'}</td>
        <td>${pt.phone_number || '-'}</td>
        <td>${pt.place_name || '-'}</td>
        <td>
          ${pt.can_delete ? `<button class="btn-btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteMaster('parties', ${pt.id})"><i class="fa-solid fa-trash"></i> Delete</button>` : '<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-lock"></i> Locked</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Error loading parties.</td></tr>';
  }
}

async function loadVarietiesTable() {
  const tbody = document.getElementById('varietiesTbody');
  try {
    const res = await fetch('/api/varieties/');
    const varieties = await res.json();

    tbody.innerHTML = varieties.map(v => `
      <tr>
        <td><img src="${v.photo || 'https://via.placeholder.com/36?text=Bag'}" class="thumbnail-img"></td>
        <td style="font-weight: 700;">${v.name}</td>
        <td style="font-weight: 600;">${v.kgs_per_bag} kg</td>
        <td>
          ${v.can_delete ? `<button class="btn-btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteMaster('varieties', ${v.id})"><i class="fa-solid fa-trash"></i> Delete</button>` : '<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-lock"></i> Locked</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4">Error loading varieties.</td></tr>';
  }
}

async function deleteMaster(endpoint, id) {
  if (currentRole !== 'OWNER') {
    alert('ACCESS DENIED! Only the OWNER has authority to delete master records.');
    return;
  }

  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    const res = await fetch(`/api/${endpoint}/${id}/`, { method: 'DELETE' });
    if (res.ok) {
      alert('Deleted successfully.');
      loadAllMasterData();
      renderMasterTables();
    } else {
      const data = await res.json();
      alert('Delete failed: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Server error during deletion!');
  }
}

async function saveUser(e) {
  e.preventDefault();
  const payload = {
    username: document.getElementById('newUsername').value,
    password: document.getElementById('newPassword').value,
    role: document.getElementById('newRole').value
  };

  const res = await fetch('/api/users/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    alert('User created!');
    closeModal('userModal');
    loadUsersTable();
  } else {
    alert('Error creating user.');
  }
}

async function savePlace(e) {
  e.preventDefault();
  const name = document.getElementById('newPlaceName').value;
  const res = await fetch('/api/places/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name})
  });
  if (res.ok) {
    alert('Place saved!');
    closeModal('placeModal');
    loadAllMasterData();
    loadPlacesTable();
  } else {
    alert('Error saving place.');
  }
}

async function saveParty(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('newPartyName').value,
    shortcut_name: document.getElementById('newPartyShortcut').value,
    phone_number: document.getElementById('newPartyPhone').value || null,
    place: document.getElementById('newPartyPlace').value || null
  };

  const res = await fetch('/api/parties/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    alert('Party created!');
    closeModal('partyModal');
    loadAllMasterData();
    loadPartiesTable();
  } else {
    alert('Error saving party.');
  }
}

async function saveVariety(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('name', document.getElementById('newVarietyName').value);
  formData.append('kgs_per_bag', document.getElementById('newVarietyKgs').value);
  
  const photoFile = document.getElementById('newVarietyPhoto').files[0];
  if (photoFile) formData.append('photo', photoFile);

  const res = await fetch('/api/varieties/', {
    method: 'POST',
    body: formData
  });

  if (res.ok) {
    alert('Variety created!');
    closeModal('varietyModal');
    loadAllMasterData();
    loadVarietiesTable();
  } else {
    alert('Error saving variety.');
  }
}

function filterTable(tbodyId, searchVal) {
  const term = searchVal.toLowerCase();
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(term) ? '' : 'none';
  });
}
