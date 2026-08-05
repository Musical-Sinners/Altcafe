import { X } from "lucide-react";
import "./Modal.css";

function Modal({ open, onClose, children, dismissible = true }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => dismissible && onClose?.()}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {dismissible && (
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export default Modal;