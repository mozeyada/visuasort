import React, { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';
import SearchFilter from './SearchFilter';
import ImageGrid from './ImageGrid';
import Modal from './Modal';
import { imageService } from '../services/imageService';

const Gallery = ({ token, user, onLogout }) => {
  const [images, setImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState(null);
  const [modalMode, setModalMode] = useState('view');

  useEffect(() => {
    if (!token) {
      console.log('No token available, skipping data fetch');
      setLoading(false);
      return;
    }

    console.log('Fetching data with token:', token.substring(0, 10) + '...');
    
    // Self-contained effect - functions defined inside
    const fetchImages = async (endpoint = '/api/v1/images') => {
      try {
        const data = await imageService.getImages(token, endpoint);
        const imageList = data.data || data;
        setImages(imageList);
        setFilteredImages(imageList);
        console.log('Images loaded:', imageList.length);
      } catch (error) {
        console.error('Failed to load images:', error);
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          console.log('Token expired, redirecting to login');
          onLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const data = await imageService.getCategories(token);
        setCategories(data);
        console.log('Categories loaded:', data.length);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    // Call them immediately
    fetchImages();
    fetchCategories();
    
    // Store loadImages function for admin use
    window.loadImages = fetchImages;
  }, [token, onLogout]); // token and onLogout are dependencies

  const refreshData = async () => {
    try {
      const data = await imageService.getImages(token);
      const imageList = data.data || data;
      setImages(imageList);
      setFilteredImages(imageList);
    } catch (error) {
      console.error('Failed to refresh images:', error);
    }
  };

  const refreshCategories = async () => {
    try {
      const data = await imageService.getCategories(token);
      setCategories(data);
    } catch (error) {
      console.error('Failed to refresh categories:', error);
    }
  };

  const handleUpload = async (file, options = {}) => {
    try {
      await imageService.uploadImage(file, token, options);
      refreshData();
      refreshCategories();
      
      // Auto-refresh after 3 seconds if using AI or enhancement
      if (options.useAI || options.autoEnhance) {
        setTimeout(() => {
          refreshData();
        }, 3000);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    
    try {
      await imageService.deleteImage(imageId, token);
      refreshData();
      refreshCategories();
    } catch (error) {
      alert('Failed to delete image: ' + error.message);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setFilteredImages(images);
      return;
    }

    try {
      const data = await imageService.searchImages(query, token);
      const results = data.data || data;
      setFilteredImages(results);
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to client-side search
      const filtered = images.filter(img => 
        img.filename.toLowerCase().includes(query.toLowerCase()) ||
        (img.tags && img.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
      );
      setFilteredImages(filtered);
    }
  };

  const handleFilter = async (filters) => {
    if (!filters.sizeRange && !filters.dateRange && !filters.captionCategory) {
      setFilteredImages(images);
      return;
    }

    try {
      const data = await imageService.filterImages(filters, token);
      const results = data.data || data;
      setFilteredImages(results);
    } catch (error) {
      console.error('Filter failed:', error);
      setFilteredImages(images);
    }
  };

  const handleImageClick = (image) => {
    setModalImage(image);
    setModalMode('view');
  };

  const handleDownload = (image) => {
    const link = document.createElement('a');
    link.href = `/uploads/${image.filename}`;
    link.download = image.filename;
    link.click();
  };

  const handleReEnhance = (imageId) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      setModalImage(image);
      setModalMode('reenhance');
    }
  };
  
  const handleReEnhanceApply = async (options) => {
    console.log('📝 Frontend sending options:', options);
    console.log('🇮🇩 Image ID:', modalImage.id);
    
    try {
      const response = await fetch(`/api/v1/images/${modalImage.id}/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(options)
      });
      
      console.log('📶 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Success:', result.message);
        refreshData();
      } else {
        const error = await response.json();
        console.error('❌ Error response:', error);
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('❌ Request failed:', error);
      throw error;
    }
  };

  if (loading) {
    return <div className="loading">Loading images...</div>;
  }

  return (
    <div className="gallery-container">
      <header className="gallery-header">
        <h1>Visuasort Gallery</h1>
        <div className="header-controls">
          <span className="user-info">
            {user?.role === 'admin' ? '👑 Admin' : '👤 User'}
          </span>
          {user?.role === 'admin' && (
            <>
              <button 
                onClick={() => window.loadImages('/api/v1/images')} 
                className="btn btn-secondary"
              >
                View My Images
              </button>
              <button 
                onClick={() => window.loadImages('/api/v1/images/admin/all')} 
                className="btn btn-primary"
              >
                View All Users' Images
              </button>
            </>
          )}
          <button onClick={onLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <ImageUpload onUpload={handleUpload} />
      
      <SearchFilter 
        onSearch={handleSearch}
        onFilter={handleFilter}
        categories={categories}
      />

      <ImageGrid 
        images={filteredImages}
        onImageClick={handleImageClick}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onReEnhance={handleReEnhance}
        showOwner={user?.role === 'admin'}
      />

      {modalImage && (
        <Modal 
          image={modalImage} 
          mode={modalMode}
          onClose={() => setModalImage(null)}
          onReEnhance={handleReEnhanceApply}
        />
      )}
    </div>
  );
};

export default Gallery;