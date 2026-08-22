import React, { useState, useEffect } from 'react';
import { getDashboard } from '../api';

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

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <i className="fas fa-wheat-awn" style={{ color: '#f59e0b' }}></i> MOTHER INDIA MILL Dashboard
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card stat-card-blue" style={{ borderTop: '4px solid #2563eb', padding: '1.5rem', background: 'linear-gradient(to bottom right, #ffffff, #f0fdf4)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div className="stat-icon" style={{ color: '#2563eb', fontSize: '2rem', marginBottom: '1rem' }}><i className="fas fa-boxes"></i></div>
          <div className="stat-info">
            <div className="stat-lbl" style={{ color: '#64748b', fontSize: '0.875rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Opening Stock</div>
            <div className="stat-val" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.opening}</div>
          </div>
        </div>
        <div className="stat-card stat-card-emerald" style={{ borderTop: '4px solid #10b981', padding: '1.5rem', background: 'linear-gradient(to bottom right, #ffffff, #ecfdf5)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div className="stat-icon" style={{ color: '#10b981', fontSize: '2rem', marginBottom: '1rem' }}><i className="fas fa-arrow-down"></i></div>
          <div className="stat-info">
            <div className="stat-lbl" style={{ color: '#64748b', fontSize: '0.875rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Today's Inward</div>
            <div className="stat-val" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.todayInward}</div>
          </div>
        </div>
        <div className="stat-card stat-card-rose" style={{ borderTop: '4px solid #ef4444', padding: '1.5rem', background: 'linear-gradient(to bottom right, #ffffff, #fef2f2)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div className="stat-icon" style={{ color: '#ef4444', fontSize: '2rem', marginBottom: '1rem' }}><i className="fas fa-arrow-up"></i></div>
          <div className="stat-info">
            <div className="stat-lbl" style={{ color: '#64748b', fontSize: '0.875rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Today's Outward</div>
            <div className="stat-val" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.todayOutward}</div>
          </div>
        </div>
        <div className="stat-card stat-card-amber" style={{ borderTop: '4px solid #f59e0b', padding: '1.5rem', background: 'linear-gradient(to bottom right, #ffffff, #fffbeb)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div className="stat-icon" style={{ color: '#f59e0b', fontSize: '2rem', marginBottom: '1rem' }}><i className="fas fa-cubes"></i></div>
          <div className="stat-info">
            <div className="stat-lbl" style={{ color: '#64748b', fontSize: '0.875rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Closing Stock</div>
            <div className="stat-val" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.closing}</div>
          </div>
        </div>
      </div>
      <div className="dashboard-summary" style={{ textAlign: 'center', color: '#475569', fontSize: '1.125rem' }}>
        <p>Stock Position as of <strong>{businessDate ? new Date(businessDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString()}</strong></p>
      </div>
    </div>
  );
};

export default Dashboard;
