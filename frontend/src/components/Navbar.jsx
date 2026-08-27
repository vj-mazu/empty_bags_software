import { useState, useEffect } from 'react';
import { getAlerts } from '../api';

export default function Navbar({ activeTab, setActiveTab, onSelectMaster, user, onLogin, onLogout, alertCount, onAlertClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localAlertCount, setLocalAlertCount] = useState(alertCount || 0);

  useEffect(() => {
    getAlerts()
      .then(data => {
        const count = (data.low_stock_alerts?.length || 0) + (data.aging_stock_alerts?.length || 0);
        setLocalAlertCount(count);
      })
      .catch(err => console.error('Failed to fetch alerts', err));
  }, []);

  const handleMasterClick = (section) => {
    setDropdownOpen(false);
    if (onSelectMaster) {
      onSelectMaster(section);
    } else {
      setActiveTab('masters');
    }
  };

  return (
    <header className="navbar">
      <div className="brand">
        <i className="fas fa-wheat-awn"></i>
        <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
          MOTHER INDIA MILL
        </h1>
      </div>
      
      <nav className="nav-links">
        <button className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <i className="fas fa-chart-pie"></i> Dashboard
        </button>
        <button className={`nav-tab ${activeTab === 'stocks' ? 'active' : ''}`} onClick={() => setActiveTab('stocks')}>
          <i className="fas fa-boxes-stacked"></i> Stocks
        </button>
        <button className={`nav-tab ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
          <i className="fas fa-book-open"></i> Empty Bags Ledger
        </button>
        <button className={`nav-tab ${activeTab === 'place-ledger' ? 'active' : ''}`} onClick={() => setActiveTab('place-ledger')}>
          <i className="fas fa-map-location-dot"></i> Place Stock Ledger
        </button>
        
        <div className="dropdown" style={{ position: 'relative' }} onMouseEnter={() => setDropdownOpen(true)} onMouseLeave={() => setDropdownOpen(false)}>
          <button className={`nav-tab ${activeTab === 'masters' ? 'active' : ''}`} onClick={() => handleMasterClick('party')}>
            <i className="fas fa-sliders"></i> Master Creation <i className="fas fa-caret-down" style={{ marginLeft: '0.25rem' }}></i>
          </button>
          
          {dropdownOpen && (
            <div className="nav-dropdown-menu">
              <div className="nav-dropdown-item" onClick={() => handleMasterClick('party')}>
                <i className="fas fa-address-book" style={{ color: '#2563eb' }}></i>
                <span>Party Master</span>
              </div>
              <div className="nav-dropdown-item" onClick={() => handleMasterClick('variety')}>
                <i className="fas fa-wheat-awn" style={{ color: '#10b981' }}></i>
                <span>Variety Master</span>
              </div>
              <div className="nav-dropdown-item" onClick={() => handleMasterClick('place')}>
                <i className="fas fa-warehouse" style={{ color: '#f59e0b' }}></i>
                <span>Place Master</span>
              </div>
              <div className="nav-dropdown-item" onClick={() => handleMasterClick('user')}>
                <i className="fas fa-user-gear" style={{ color: '#8b5cf6' }}></i>
                <span>User Management</span>
              </div>
            </div>
          )}
        </div>

        {user?.role === 'OWNER' && (
          <button className={`nav-tab ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
            <i className="fas fa-clipboard-check"></i> Approvals
          </button>
        )}
      </nav>

      <div className="nav-right">
        <button className="alert-bell" onClick={onAlertClick} title="Notifications">
          <i className="fas fa-bell"></i>
          {localAlertCount > 0 && (
            <span className="bell-badge">
              {localAlertCount}
            </span>
          )}
        </button>
        
        {user ? (
          <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.85rem' }}>{user.username}</span>
            {user.username.toLowerCase() !== user.role.toLowerCase() && (
              <span className={`role-pill ${user.role === 'OWNER' ? 'role-owner' : 'role-staff'}`}>
                {user.role}
              </span>
            )}
            <button 
              className="btn btn-sm" 
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(false);
                if (onLogout) onLogout();
              }} 
              style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 'bold', padding: '4px 10px', cursor: 'pointer' }}
            >
              <i className="fas fa-right-from-bracket"></i> Logout
            </button>
          </div>
        ) : (
          <button className="btn btn-blue" onClick={onLogin}>
            <i className="fas fa-right-to-bracket"></i> Login
          </button>
        )}
      </div>
    </header>
  );
}
