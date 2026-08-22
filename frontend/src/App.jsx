import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Stocks from './components/Stocks';
import EmptyBagsLedger from './components/EmptyBagsLedger';
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
  const [showLogin, setShowLogin] = useState(false);
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
      // Server session expired — force logout on frontend
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
        // Session expired server-side but localStorage still has old data
        setUser(null);
        try {
          localStorage.removeItem('mother_india_user');
          sessionStorage.clear();
        } catch (e) {}
        showToast('Session expired. Please login again.', 'error', 5000);
      }
    };
    checkSession();
  }, []); // run once on mount

  useEffect(() => {
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

    // Delay checking slightly on initial load so login redirect/dashboard toasts can clear
    const timer = setTimeout(checkLowStock, 2000);
    const interval = setInterval(checkLowStock, 3600000); // 1 hour
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem('mother_india_user', JSON.stringify(userData));
    } catch (e) {
      console.error('Failed to save user session', e);
    }
    showToast(`Logged in successfully as ${userData.username || 'User'}!`);
  };

  // ─── FIXED: Await API logout BEFORE clearing local state ──────────────────
  const handleLogout = async () => {
    if (loggingOut) return; // prevent double-click
    setLoggingOut(true);

    try {
      // 1. First destroy server session (await it)
      await apiLogout();
    } catch (err) {
      // Even if API fails, proceed with local cleanup
      console.warn('Server logout API:', err.message);
    }

    try {
      // 2. Then clear local state
      localStorage.removeItem('mother_india_user');
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear user session', e);
    }

    // 3. Clear caches
    invalidateCache('');

    // 4. Set user to null LAST (triggers re-render to login screen)
    setUser(null);
    setLoggingOut(false);

    if (activeTab === 'approvals') {
      setActiveTab('dashboard');
    }
    showToast('Logged out successfully!');
  };

  const handleSelectMaster = (section) => {
    setActiveTab('masters');
    setMasterSubSection(section);
  };

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
        onLogin={() => setShowLogin(true)} 
        onLogout={handleLogout} 
        onAlertClick={() => setShowAlerts(true)} 
      />

      <main className="main-content" style={activeTab === 'stocks' ? { padding: '1.25rem 0', width: '100%', maxWidth: '100%' } : { padding: '1.25rem' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'stocks' && <Stocks user={user} showToast={showToast} />}
        {activeTab === 'ledger' && <EmptyBagsLedger />}
        {activeTab === 'masters' && <MasterCreation user={user} activeSection={masterSubSection} showToast={showToast} />}
        {activeTab === 'approvals' && <Approvals showToast={showToast} />}
      </main>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLogin={handleLogin} showToast={showToast} />}
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

