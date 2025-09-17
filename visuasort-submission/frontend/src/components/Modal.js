import React, { useEffect, useState } from 'react';

const Modal = ({ image, onClose, mode = 'view', onReEnhance }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const [enhanceOptions, setEnhanceOptions] = useState({
    autoEnhance: false,
    addWatermark: false,
    applyFilter: 'none'
  });
  const [loading, setLoading] = useState(false);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleApplyEnhancement = async () => {
    setLoading(true);
    try {
      await onReEnhance(enhanceOptions);
      onClose();
    } catch (error) {
      alert('Re-enhancement failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'reenhance') {
    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="reenhance-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Re-enhance: {image.filename}</h3>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="enhancement-options">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={enhanceOptions.autoEnhance}
                  onChange={e => setEnhanceOptions({...enhanceOptions, autoEnhance: e.target.checked})}
                />
                Auto-enhance (brightness, contrast, sharpness)
              </label>
              
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={enhanceOptions.addWatermark}
                  onChange={e => setEnhanceOptions({...enhanceOptions, addWatermark: e.target.checked})}
                />
                Add watermark
              </label>
              
              <div className="filter-option">
                <label>Apply filter:</label>
                <select
                  value={enhanceOptions.applyFilter}
                  onChange={e => setEnhanceOptions({...enhanceOptions, applyFilter: e.target.value})}
                >
                  <option value="none">None</option>
                  <option value="vintage">Vintage</option>
                  <option value="dramatic">Dramatic</option>
                  <option value="bw_artistic">B&W Artistic</option>
                  <option value="soft_portrait">Soft Portrait</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleApplyEnhancement} disabled={loading}>
              {loading ? 'Processing...' : 'Apply Enhancement'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <span className="modal-close" onClick={onClose}>
        &times;
      </span>
      <img
        src={image.enhancedPath ? `/${image.enhancedPath}` : `/uploads/${image.filename}`}
        alt={image.displayName || image.filename}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="modal-info">
        <h3>{image.displayName || image.filename}</h3>
        <p>Tags: {Array.isArray(image.tags) ? image.tags.join(', ') : image.tags}</p>
        {image.hasEnhancements && <p className="enhancement-badge">✨ Enhanced</p>}
      </div>
    </div>
  );
};

export default Modal;