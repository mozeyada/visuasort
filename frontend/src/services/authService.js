// Get API base from backend configuration
let API_BASE = '/api/v1'; // fallback

// Initialize API base from backend
fetch('/api/config')
  .then(res => res.json())
  .then(config => {
    API_BASE = config.apiBase || '/api/v1';
  })
  .catch(() => {
    console.warn('Could not load API configuration, using fallback');
  });

export const authService = {
  async login(username, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  }
};