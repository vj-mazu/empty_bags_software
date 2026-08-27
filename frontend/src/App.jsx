import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Stocks from './components/Stocks';
import EmptyBagsLedger from './components/EmptyBagsLedger';
import PlaceStockLedger from './components/PlaceStockLedger';
import MasterCreation from './components/MasterCreation';
import Approvals from './components/Approvals';
import LoginModal from './components/LoginModal';
import AlertsModal from './components/AlertsModal';
import { getVarieties, logout as apiLogout, setSessionExpiredHandler, validateSession, invalidateCache } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [masterSubSection, setMasterSubSection] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mother_india_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [showAlerts, setShowAlerts] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'success', duration = 3000) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), duration);
  };

  // ─── Register session expiry handler (called by api.js on 401/403) ──────
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      try {
        localStorage.removeItem('mother_india_user');
        sessionStorage.clear();
      } catch (e) {}
      invalidateCache('');
      showToast('Session expired. Please login again.', 'error', 5000);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  // ─── Validate session on app load (detect stale localStorage) ────────────
  useEffect(() => {
    if (!user) return;
    
    const checkSession = async () => {
      const isValid = await validateSession();
      if (!isValid) {
        setUser(null);
        try {
          localStorage.removeItem('mother_india_user');
          sessionStorage.clear();
        } catch (e) {}
        showToast('Session expired. Please login again.', 'error', 5000);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    const checkLowStock = () => {
      getVarieties().then(res => {
        const list = res.results || res.data || res;
        if (Array.isArray(list)) {
          list.forEach(v => {
            const bags = parseInt(v.current_stock_bags || 0, 10);
            if (bags < 2000) {
              showToast(`Low Stock Alert: ${v.name} has only ${bags.toLocaleString()} bags remaining!`, 'error', 5000);
            }
          });
        }
      }).catch(console.error);
    };

    const timer = setTimeout(checkLowStock, 2000);
    const interval = setInterval(checkLowStock, 3600000); // 1 hour
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem('mother_india_user', JSON.stringify(userData));
    } catch (e) {
      console.error('Failed to save user session', e);
    }
    showToast(`Welcome back, ${userData.username || 'User'}!`);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await apiLogout();
    } catch (err) {
      console.warn('Server logout API:', err.message);
    }

    try {
      localStorage.removeItem('mother_india_user');
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear user session', e);
    }

    invalidateCache('');
    setUser(null);
    setLoggingOut(false);
    setActiveTab('dashboard');
    showToast('Logged out successfully!');
  };

  const handleSelectMaster = (section) => {
    setActiveTab('masters');
    setMasterSubSection(section);
  };

  // ─── If not logged in, render dedicated secure Full-Page Login Screen ────
  if (!user) {
    return (
      <div className="login-fullpage-container">
        <LoginModal onLogin={handleLogin} isFullPage={true} />
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
              <i className={toast.type === 'error' ? "fas fa-circle-xmark" : "fas fa-circle-check"}></i>
              {toast.text}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'masters') setMasterSubSection(null);
        }}
        onSelectMaster={handleSelectMaster}
        user={user} 
        onLogout={handleLogout} 
        onAlertClick={() => setShowAlerts(true)} 
      />

      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'stocks' && <Stocks user={user} showToast={showToast} />}
        {activeTab === 'ledger' && <EmptyBagsLedger />}
        {activeTab === 'place-ledger' && <PlaceStockLedger />}
        {activeTab === 'masters' && <MasterCreation user={user} activeSection={masterSubSection} showToast={showToast} />}
        {activeTab === 'approvals' && <Approvals showToast={showToast} />}
      </main>

      {showAlerts && <AlertsModal onClose={() => setShowAlerts(false)} />}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
            <i className={toast.type === 'error' ? "fas fa-circle-xmark" : "fas fa-circle-check"}></i>
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}
