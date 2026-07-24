import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Stocks from './components/Stocks';
import EmptyBagsLedger from './components/EmptyBagsLedger';
import MasterCreation from './components/MasterCreation';
import Approvals from './components/Approvals';
import LoginModal from './components/LoginModal';
import AlertsModal from './components/AlertsModal';
import { getVarieties } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [masterSubSection, setMasterSubSection] = useState(null);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'success', duration = 3000) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), duration);
  };

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
    showToast('Logged in successfully!');
  };

  const handleLogout = () => {
    setUser(null);
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
