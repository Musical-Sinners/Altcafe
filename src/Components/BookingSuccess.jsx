import { CheckCircle2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import "./BookingSuccess.css";

const confettiColors = ["#f4b740", "#0f5132", "#2ecc71", "#1b6b47", "#c8931f"];

function BookingSuccess({ open, onClose, turf, day, time }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="booking-success">
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

        <div className="booking-success-check">
          <CheckCircle2 size={40} strokeWidth={2.2} />
        </div>

        <h2 className="booking-success-title">Booking Placed</h2>

        <div className="booking-success-details">
          <p className="booking-success-day">{day}, {time}</p>
          <p className="booking-success-turf">{turf}</p>
        </div>

        <p className="booking-success-note">
          Your slot is held. An admin will confirm your booking shortly.
        </p>

        <Button className="booking-success-btn" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

export default BookingSuccess;