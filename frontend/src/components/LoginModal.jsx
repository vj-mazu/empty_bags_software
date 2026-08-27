import { useState } from 'react';
import { login } from '../api.js';

export default function LoginModal({ onClose, onLogin, isFullPage = false }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const res = await login(username, password);
      onLogin({ username: res.username, role: res.role, user_id: res.user_id });
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const containerClass = isFullPage ? "login-fullpage-wrapper" : "login-screen-overlay";

  return (
    <div className={containerClass}>
      <div className="login-card">
        {onClose && !isFullPage && (
          <button className="login-close-btn" onClick={onClose}>&times;</button>
        )}

        <div className="login-header">
          <div className="login-icon">
            <i className="fas fa-wheat-awn" style={{ color: '#f59e0b', fontSize: '2.5rem' }}></i>
          </div>
          <h2 className="login-title">MOTHER INDIA MILL</h2>
          <p className="login-subtitle">Empty Bags Stock Management Portal</p>
        </div>

        {error && (
          <div className="login-error-msg">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field-group">
            <label>Username</label>
            <input 
              type="text" 
              className="login-input"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              placeholder="Enter your username"
              autoFocus
            />
          </div>

          <div className="login-field-group">
            <label>Password</label>
            <input 
              type="password" 
              className="login-input"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="login-credentials-box">
          <div className="cred-title">System Credentials:</div>
          <div className="cred-line"><span>Staff Account:</span> <strong>staff1</strong> / <strong>staff123</strong></div>
          <div className="cred-line"><span>Owner / Admin:</span> <strong>owner</strong> / <strong>owner123</strong></div>
        </div>
      </div>
    </div>
  );
}
