import { useState, useEffect, useCallback, memo } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

const Lightbox = ({ images, initialIndex = 0, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  const prev = useCallback(() => {
    setIndex(i => i === 0 ? images.length - 1 : i - 1);
    setZoom(1);
  }, [images.length]);

  const next = useCallback(() => {
    setIndex(i => i === images.length - 1 ? 0 : i + 1);
    setZoom(1);
  }, [images.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 animate-fade-in" onClick={onClose}>
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 p-3 rounded-full glass" style={{ color: 'white' }} aria-label="Close lightbox">
        <X size={24} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg glass text-sm font-medium" style={{ color: 'white' }}>
        {index + 1} / {images.length}
      </div>

      {/* Zoom */}
      <button onClick={(e) => { e.stopPropagation(); setZoom(z => z === 1 ? 2 : 1); }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 p-3 rounded-full glass" style={{ color: 'white' }} aria-label={zoom > 1 ? 'Zoom out' : 'Zoom in'}>
        {zoom > 1 ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
      </button>

      {/* Image */}
      <div className="flex items-center justify-center w-full h-full px-16 py-16" onClick={e => e.stopPropagation()}>
        <img
          src={images[index]}
          alt={`Photo ${index + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-300 rounded-lg"
          style={{ transform: `scale(${zoom})` }}
          onClick={() => setZoom(z => z === 1 ? 2 : 1)}
        />
      </div>

      {/* Nav Arrows */}
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 glass rounded-full flex items-center justify-center" style={{ color: 'white' }} aria-label="Previous photo">
            <ChevronLeft size={24} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 glass rounded-full flex items-center justify-center" style={{ color: 'white' }} aria-label="Next photo">
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 p-2 rounded-xl glass">
          {images.map((img, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setIndex(i); setZoom(1); }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === index ? 'border-amber-400 scale-110' : 'opacity-60 hover:opacity-100'}`}
              aria-label={`View photo ${i + 1}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(Lightbox);
