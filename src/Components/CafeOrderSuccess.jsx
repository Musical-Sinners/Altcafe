import { CheckCircle2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import "./CafeOrderSuccess.css";

const confettiColors = ["#f4b740", "#0f5132", "#2ecc71", "#1b6b47", "#c8931f"];

function CafeOrderSuccess({ open, onClose, count, total }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="cafe-success">
        <div className="confetti-field" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${(i * 37) % 100}%`,
                background: confettiColors[i % confettiColors.length],
                animationDelay: `${(i % 8) * 0.08}s`,
              }}
            />
          ))}
        </div>

        <div className="cafe-success-check">
          <CheckCircle2 size={40} strokeWidth={2.2} />
        </div>

        <h2 className="cafe-success-title">Order Placed</h2>

        <div className="cafe-success-details">
          <p className="cafe-success-line">
            {count} item{count > 1 ? "s" : ""} · ৳{total}
          </p>
          <p className="cafe-success-sub">Ready for pickup in ~10 minutes</p>
        </div>

        <Button className="cafe-success-btn" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

export default CafeOrderSuccess;