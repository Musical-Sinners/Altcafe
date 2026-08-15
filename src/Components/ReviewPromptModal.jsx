import { useState } from "react";
import { Star, Coffee, Volleyball } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { auth } from "../firebase";
import { getUserProfile } from "../lib/userService";
import { submitReview } from "../lib/reviewService";
import { useToast } from "../contexts/ToastContext";
import "./ReviewPromptModal.css";

/**
 * Lightweight review prompt shown right after a cafe order is marked
 * "completed" or a turf booking is marked "confirmed". Reviewing is always
 * optional — the person can dismiss it with "Maybe later" and it won't
 * reappear for that same order/booking (see AppLayout for the dedupe logic).
 */
function ReviewPromptModal({ open, type, onClose }) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isCafe = type === "cafe";

  const reset = () => {
    setRating(0);
    setComment("");
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      handleClose();
      return;
    }
    if (rating === 0) {
      showToast("Please select a star rating.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const profile = await getUserProfile(currentUser.uid);
      await submitReview(currentUser.uid, {
        type,
        rating,
        comment,
        userName: profile?.name || profile?.phone || profile?.email || "Anonymous",
      });
      showToast("Thanks for your feedback!");
      handleClose();
    } catch (err) {
      console.error(err);
      showToast("Could not submit your review. Please try again.", "error");
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="review-prompt">
        <div className="review-prompt-icon">
          {isCafe ? <Coffee size={22} strokeWidth={2} /> : <Volleyball size={22} strokeWidth={2} />}
        </div>

        <h2 className="review-prompt-title">
          {isCafe ? "How was your order?" : "How was your booking?"}
        </h2>
        <p className="review-prompt-copy">
          {isCafe
            ? "Your order is complete — leave a quick rating if you have a moment."
            : "Your turf booking is confirmed — leave a quick rating if you have a moment."}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="review-prompt-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  size={30}
                  strokeWidth={1.8}
                  fill={n <= rating ? "var(--color-accent, #f5a623)" : "none"}
                  color={n <= rating ? "var(--color-accent, #f5a623)" : "var(--color-line)"}
                />
              </button>
            ))}
          </div>

          <textarea
            className="review-prompt-textarea"
            placeholder={isCafe ? "How was the food, drinks, and service? (optional)" : "How was the turf and staff? (optional)"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          <div className="review-prompt-actions">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              Maybe later
            </Button>
            <Button type="submit" loading={submitting}>
              Submit
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default ReviewPromptModal;