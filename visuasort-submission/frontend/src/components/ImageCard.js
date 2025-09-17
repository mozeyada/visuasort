import React from 'react';

const ImageCard = ({ image, onClick, onDownload, onDelete, onReEnhance, showOwner = false }) => {
  const formatTags = (tags) => {
    if (!tags) return 'No tags';
    
    if (Array.isArray(tags)) {
      const tagString = tags.join(', ');
      return tagString === 'processing...' ? '🔄 AI Processing...' : tagString;
    }
    
    return tags === 'processing...' ? '🔄 AI Processing...' : tags;
  };

  // Use enhanced path if available, otherwise fallback to original
  const thumbnailSrc = image.thumbnailPath 
    ? `/${image.thumbnailPath}` 
    : `/uploads/${image.filename}`;

  return (
    <div className="image-card">
      <img
        src={thumbnailSrc}
        alt={image.filename}
        className="thumbnail"
        onClick={onClick}
        onError={(e) => {
          e.target.src = `/uploads/${image.filename}`;
        }}
      />
      
      <div className="card-info">
        <p className="filename">{image.displayName || image.filename}</p>
        <p className="tags">
          <strong>Tags:</strong> {formatTags(image.tags)}
        </p>
        <div className="metadata">
          <p>Size: {(image.size / 1024).toFixed(1)} KB</p>
          {showOwner && <p>Owner: {image.owner}</p>}
          <p>Uploaded: {new Date(image.uploadDate).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="card-actions">
        <button onClick={onDownload} className="action-btn download-btn">
          Download
        </button>
        <button onClick={() => onReEnhance && onReEnhance(image.id)} className="action-btn enhance-btn">
          Re-enhance
        </button>
        <button onClick={onDelete} className="action-btn delete-btn">
          Delete
        </button>
      </div>
    </div>
  );
};

export default ImageCard;