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

export const imageService = {
  async getImages(token, endpoint = '/api/v1/images', page = 1, limit = 20, sort = 'uploadDate', order = 'desc') {
    const url = endpoint.startsWith('/api') ? endpoint : `${API_BASE}/images`;
    const fullUrl = `${url}?page=${page}&limit=${limit}&sort=${sort}&order=${order}`;
    console.log('Making API call to:', fullUrl);
    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`Failed to fetch images: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    return data;
  },

  async uploadImage(file, token, options = {}) {
    const { useAI = false, autoEnhance = false, addWatermark = false, applyFilter = 'none' } = options;
    
    // Get pre-signed URL for direct S3 upload
    const presignedResponse = await fetch(`${API_BASE}/images/presigned-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, key, imageId } = await presignedResponse.json();

    // Upload directly to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('S3 upload failed');
    }

    // Notify backend of successful upload
    const notifyResponse = await fetch(`${API_BASE}/images/upload-complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        imageId,
        filename: file.name,
        size: file.size,
        useAI,
        autoEnhance,
        addWatermark,
        applyFilter
      }),
    });

    if (!notifyResponse.ok && notifyResponse.status !== 202) {
      throw new Error('Upload notification failed');
    }

    return notifyResponse.json();
  },

  async deleteImage(imageId, token) {
    const response = await fetch(`${API_BASE}/images/${imageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Delete failed');
    }

    return response.json();
  },

  async searchImages(query, token) {
    const response = await fetch(`${API_BASE}/images/search?query=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    return response.json();
  },

  async filterImages(filters, token) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const response = await fetch(`${API_BASE}/images/filter?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Filter failed');
    }

    return response.json();
  },

  async getCategories(token) {
    console.log('Making API call to:', `${API_BASE}/images/categories`);
    const response = await fetch(`${API_BASE}/images/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Categories API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Categories API error:', errorText);
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }

    const data = await response.json();
    console.log('Categories data:', data);
    return data;
  }
};