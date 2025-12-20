import { bioText } from '../data';
import { projects } from '../projects';
import ViewInfo from '../ViewInfo';

/**
 * Mobile overlay component for displaying project info or bio
 * @param {string} type - Either 'info' or 'bio'
 * @param {boolean} isOpen - Whether the overlay is visible
 * @param {Function} onClose - Callback to close the overlay
 * @param {number} viewIndex - Current view index (required for 'info' type)
 */
export default function MobileOverlay({ type = 'info', isOpen, onClose, viewIndex = 0 }) {
  if (!isOpen) return null;

  const isBio = type === 'bio';
  const title = isBio ? 'About Me' : projects[viewIndex]?.title;

  return (
    <div className="mobile-info-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mobile-info-content">
        <div className="mobile-info-header">
          <h2 className="title" style={isBio ? { marginTop: 0 } : undefined}>
            {title}
          </h2>
          <button className="close-info-btn" onClick={onClose}>×</button>
        </div>
        <div className="mobile-info-body">
          {isBio ? (
            <p className="bio">{bioText}</p>
          ) : (
            <ViewInfo viewIndex={viewIndex} />
          )}
        </div>
      </div>
    </div>
  );
}
