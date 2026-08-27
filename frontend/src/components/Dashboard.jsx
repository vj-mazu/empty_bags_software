import React, { useState, useEffect } from 'react';
import { getDashboard } from '../api';
import { formatDateLong, formatBags } from '../utils/formatters';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [businessDate, setBusinessDate] = useState('');
  const [stats, setStats] = useState({
    opening: 0,
    todayInward: 0,
    todayOutward: 0,
    closing: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getDashboard();
        
        setBusinessDate(data.business_date || '');
        setStats({
          opening: data.opening || 0,
          todayInward: data.today_inward || 0,
          todayOutward: data.today_outward || 0,
          closing: data.closing || 0
        });
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
      <i className="fas fa-spinner fa-spin fa-2x"></i>
      <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Loading Dashboard...</p>
    </div>
  );

  return (
    <div className="dashboard" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <i className="fas fa-wheat-awn" style={{ color: '#f59e0b' }}></i> MOTHER INDIA MILL Stock Dashboard
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '0.2rem' }}>
            Real-time daily empty bags inventory position and transaction overview.
          </p>
        </div>

        <div style={{ background: '#ffffff', padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontSize: '0.84rem', fontWeight: 700, color: '#1e3a8a' }}>
          <i className="fas fa-calendar-day" style={{ color: '#2563eb', marginRight: '6px' }}></i>
          {businessDate ? formatDateLong(businessDate) : formatDateLong(new Date())}
        </div>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Opening Stock */}
        <div className="card" style={{ borderTop: '4px solid #2563eb', padding: '1.35rem', margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '1.4rem' }}>
            <i className="fas fa-boxes"></i>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>Opening Stock</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{formatBags(stats.opening)}</div>
          </div>
        </div>

        {/* Today's Inward */}
        <div className="card" style={{ borderTop: '4px solid #10b981', padding: '1.35rem', margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '1.4rem' }}>
            <i className="fas fa-arrow-down"></i>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>Today's Inward</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>+{formatBags(stats.todayInward)}</div>
          </div>
        </div>

        {/* Today's Outward */}
        <div className="card" style={{ borderTop: '4px solid #ef4444', padding: '1.35rem', margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '1.4rem' }}>
            <i className="fas fa-arrow-up"></i>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>Today's Outward</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>-{formatBags(stats.todayOutward)}</div>
          </div>
        </div>

        {/* Closing Stock */}
        <div className="card" style={{ borderTop: '4px solid #f59e0b', padding: '1.35rem', margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '1.4rem' }}>
            <i className="fas fa-cubes"></i>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>Closing Stock</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b45309', marginTop: '0.2rem' }}>{formatBags(stats.closing)}</div>
          </div>
        </div>

      </div>

      <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <span>Official Empty Bags Stock Ledger Position as of <strong>{businessDate ? formatDateLong(businessDate) : formatDateLong(new Date())}</strong></span>
      </div>
    </div>
  );
};

export default Dashboard;
