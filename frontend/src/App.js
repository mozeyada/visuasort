import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Gallery from './components/Gallery';
import { authService } from './services/authService';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    console.log('Checking saved token:', savedToken ? 'Found' : 'Not found');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const handleAuthLogin = (authData) => {
    if (authData.token && authData.user) {
      setToken(authData.token);
      setUser(authData.user);
      setIsAuthenticated(true);
    } else {
      // Fallback for old format
      setUser(authData);
      setIsAuthenticated(true);
    }
  };

  return (
    <div className="App">
      {!isAuthenticated ? (
        <Auth onLogin={handleAuthLogin} />
      ) : (
        <Gallery token={token} user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;