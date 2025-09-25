import React, { useState } from 'react';

const ImageUpload = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [addWatermark, setAddWatermark] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [uploadMethod, setUploadMethod] = useState('standard');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleDirectUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setMessage('Getting pre-signed URL...');
    
    try {
      const token = localStorage.getItem('token');
      
      // Step 1: Get pre-signed URL
      const response = await fetch('/api/v1/images/presigned-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type
        })
      });
      
      if (!response.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, key, imageId } = await response.json();
      
      setMessage('Uploading directly to S3...');
      
      // Step 2: Upload directly to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      
      if (!uploadResponse.ok) throw new Error('Direct S3 upload failed');
      
      setMessage('Notifying backend...');
      
      // Step 3: Notify backend
      await fetch('/api/v1/images/upload-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key, imageId, filename: file.name, size: file.size })
      });
      
      setMessage('✅ Direct S3 upload successful!');
      setFile(null);
      if (onUpload) onUpload();
      
    } catch (error) {
      setMessage('❌ Direct upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select an image');
      return;
    }

    if (uploadMethod === 'direct') {
      await handleDirectUpload();
      return;
    }

    setUploading(true);
    setMessage('Uploading and analyzing image...');

    const result = await onUpload(file, {
      useAI,
      autoEnhance,
      addWatermark,
      applyFilter: selectedFilter
    });
    
    if (result.success) {
      setFile(null);
      setMessage('Image uploaded successfully!');
      // Reset file input
      e.target.reset();
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Upload failed: ' + result.error);
    }
    
    setUploading(false);
  };

  return (
    <section className="upload-section">
      <h3>Upload Image</h3>
      <form onSubmit={handleSubmit} className="upload-form">
        <div className="upload-controls">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
          
          <div className="upload-method-selection">
            <label className="radio-option">
              <input
                type="radio"
                name="uploadMethod"
                value="standard"
                checked={uploadMethod === 'standard'}
                onChange={(e) => setUploadMethod(e.target.value)}
                disabled={uploading}
              />
              📎 Standard Upload (with processing)
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="uploadMethod"
                value="direct"
                checked={uploadMethod === 'direct'}
                onChange={(e) => setUploadMethod(e.target.value)}
                disabled={uploading}
              />
              🚀 Direct S3 Upload (Assessment Demo)
            </label>
          </div>
          {uploadMethod === 'standard' && <div className="enhancement-options">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                disabled={uploading}
              />
              🤖 AI tagging (uses API quota)
            </label>
            
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={autoEnhance}
                onChange={(e) => setAutoEnhance(e.target.checked)}
                disabled={uploading}
              />
              🎨 Auto-enhance (brightness, contrast, sharpness)
            </label>
            
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={addWatermark}
                onChange={(e) => setAddWatermark(e.target.checked)}
                disabled={uploading}
              />
              🏷️ Add watermark
            </label>
            
            <div className="filter-option">
              <label htmlFor="filter-select">🌈 Artistic filter:</label>
              <select
                id="filter-select"
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                disabled={uploading}
              >
                <option value="none">None</option>
                <option value="vintage">Vintage</option>
                <option value="dramatic">Dramatic</option>
                <option value="bw_artistic">B&W Artistic</option>
                <option value="soft_portrait">Soft Portrait</option>
              </select>
            </div>
          </div>}
          <button 
            type="submit" 
            disabled={uploading || !file}
            className="btn btn-primary"
          >
            {uploading ? 'Uploading...' : (uploadMethod === 'direct' ? 'Direct Upload to S3' : 'Upload & Process')}
          </button>
        </div>
        {message && (
          <div className={`upload-message ${message.includes('failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </form>
    </section>
  );
};

export default ImageUpload;