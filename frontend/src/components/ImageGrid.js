import React from 'react';
import ImageCard from './ImageCard';

const ImageGrid = ({ images, onImageClick, onDownload, onDelete, onReEnhance, showOwner = false }) => {
  if (images.length === 0) {
    return (
      <div className="no-images">
        <p>No images found. Upload some images to get started!</p>
      </div>
    );
  }

  return (
    <section className="gallery-section">
      <div className="image-gallery">
        {images.map(image => (
          <ImageCard
            key={image.id}
            image={image}
            onClick={() => onImageClick(image)}
            onDownload={() => onDownload(image)}
            onDelete={() => onDelete(image.id)}
            onReEnhance={onReEnhance}
            showOwner={showOwner}
          />
        ))}
      </div>
    </section>
  );
};

export default ImageGrid;