import React from 'react';
import "../styles/Modal.css";


const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  type = "info", // info, warning, error, success
  actionButtons = []
}) => {
  if (!isOpen) return null;

  // Prevent clicks inside the modal from closing it
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-container ${type}-modal`} onClick={handleModalClick}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-content">
          {children}
        </div>
        {actionButtons.length > 0 && (
          <div className="modal-actions">
            {actionButtons.map((button, index) => (
              <button 
                key={index}
                onClick={button.onClick} 
                className={button.className || `btn ${button.type || 'primary'}-btn`}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;