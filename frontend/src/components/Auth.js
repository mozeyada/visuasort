import React, { useState } from 'react';

const Auth = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    confirmationCode: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      let endpoint, body;
      
      if (mode === 'register') {
        endpoint = '/api/v1/auth/register';
        body = {
          username: formData.email,
          password: formData.password,
          email: formData.email
        };
      } else if (mode === 'confirm') {
        endpoint = '/api/v1/auth/confirm';
        body = {
          username: formData.email,
          confirmationCode: formData.confirmationCode
        };
      } else {
        endpoint = '/api/v1/auth/login';
        body = {
          username: formData.email,
          password: formData.password
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        if (mode === 'register') {
          setMessage('Registration successful! Check your email for confirmation code.');
          setShowConfirm(true);
          setMode('confirm');
        } else if (mode === 'confirm') {
          setMessage('Email confirmed! You can now login.');
          setShowConfirm(false);
          setMode('login');
        } else {
          localStorage.setItem('token', data.token);
          onLogin(data.user);
        }
      } else {
        setMessage(data.error || 'Operation failed');
      }
    } catch (error) {
      setMessage('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Visuasort Authentication</h2>
        
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button 
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
          {showConfirm && (
            <button 
              className={`auth-tab ${mode === 'confirm' ? 'active' : ''}`}
              onClick={() => setMode('confirm')}
            >
              Confirm
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <input
              type="email"
              placeholder="Email (used as username)"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="form-input"
            />
          </div>

          {mode !== 'confirm' && (
            <div className="form-group">
              <input
                type="password"
                placeholder="Password (8+ chars, uppercase, lowercase, number, symbol)"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                className="form-input"
              />
            </div>
          )}

          {mode === 'confirm' && (
            <div className="form-group">
              <input
                type="text"
                placeholder="Confirmation Code (check your email)"
                value={formData.confirmationCode}
                onChange={(e) => setFormData({...formData, confirmationCode: e.target.value})}
                required
                className="form-input"
              />
            </div>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Processing...' : 
             mode === 'register' ? 'Register' : 
             mode === 'confirm' ? 'Confirm Email' : 'Login'}
          </button>
        </form>

        {message && (
          <div className={`auth-message ${message.includes('successful') || message.includes('confirmed') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        .auth-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
        }
        .auth-title {
          text-align: center;
          margin-bottom: 30px;
          color: #333;
          font-size: 24px;
        }
        .auth-tabs {
          display: flex;
          margin-bottom: 30px;
          border-bottom: 1px solid #eee;
        }
        .auth-tab {
          flex: 1;
          padding: 12px;
          border: none;
          background: none;
          cursor: pointer;
          color: #666;
          font-size: 14px;
          border-bottom: 2px solid transparent;
        }
        .auth-tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .form-input:focus {
          outline: none;
          border-color: #667eea;
        }
        .auth-button {
          width: 100%;
          padding: 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
        }
        .auth-button:hover {
          background: #5a6fd8;
        }
        .auth-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .auth-message {
          margin-top: 20px;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
        }
        .auth-message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .auth-message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
      `}</style>
    </div>
  );
};

export default Auth;