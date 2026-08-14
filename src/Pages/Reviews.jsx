import { useEffect, useState } from "react";
import { Star, Coffee, Volleyball, MessageSquareText } from "lucide-react";
import { auth } from "../firebase";
import { getUserProfile } from "../lib/userService";
import { getOwnReview, listenToReviews, submitReview } from "../lib/reviewService";
import { useToast } from "../contexts/ToastContext";
import Button from "../Components/Button";
import Skeleton from "../Components/Skeleton";
import "./Reviews.css";

const TABS = [
  { type: "cafe", label: "Cafe", icon: Coffee },
  { type: "turf", label: "Turf", icon: Volleyball },
];

function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StarPicker({ value, onChange }) {
  return (
    <div className="review-star-picker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
          <Star size={26} strokeWidth={1.8} fill={n <= value ? "var(--color-accent, #f5a623)" : "none"} color={n <= value ? "var(--color-accent, #f5a623)" : "var(--color-line)"} />
        </button>
      ))}
    </div>
  );
}

function Reviews() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("cafe");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ownReviewLoaded, setOwnReviewLoaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToReviews(activeTab, (data) => {
      setReviews(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [activeTab]);

  // Pre-fill the form if this user already reviewed this category, so
  // re-opening the page shows what they wrote instead of a blank form.
  useEffect(() => {
    setOwnReviewLoaded(false);
    setRating(0);
    setComment("");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setOwnReviewLoaded(true);
      return;
    }
    getOwnReview(currentUser.uid, activeTab).then((existing) => {
      if (existing) {
        setRating(existing.rating);
        setComment(existing.comment);
      }
      setOwnReviewLoaded(true);
    });
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast("Please log in again to leave a review.", "error");
      return;
    }
    if (rating === 0) {
      showToast("Please select a star rating.", "error");
      return;
    }
    if (!comment.trim()) {
      showToast("Please write a few words about your experience.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const profile = await getUserProfile(currentUser.uid);
      await submitReview(currentUser.uid, {
        type: activeTab,
        rating,
        comment,
        userName: profile?.name || profile?.phone || profile?.email || "Anonymous",
      });
      showToast("Thanks for your feedback!");
    } catch (err) {
      console.error(err);
      showToast("Could not submit your review. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const average = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="reviews-page">
      <div className="reviews-inner">
        <h1>Reviews</h1>

        <div className="reviews-tabs">
          {TABS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              className={`reviews-tab ${activeTab === type ? "active" : ""}`}
              onClick={() => setActiveTab(type)}
            >
              <Icon size={16} strokeWidth={2.1} /> {label}
            </button>
          ))}
        </div>

        {average && (
          <div className="reviews-average">
            <Star size={18} strokeWidth={0} fill="var(--color-accent, #f5a623)" />
            <strong>{average}</strong>
            <span>out of 5 · {reviews.length} review{reviews.length > 1 ? "s" : ""}</span>
          </div>
        )}

        <form className="review-form surface-card" onSubmit={handleSubmit}>
          <h2>
            Rate your {activeTab === "cafe" ? "Cafe" : "Turf"} experience
          </h2>
          {ownReviewLoaded && <StarPicker value={rating} onChange={setRating} />}
          <textarea
            placeholder={
              activeTab === "cafe"
                ? "How was the food, drinks, and service?"
                : "How was the turf, booking, and staff?"
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <Button type="submit" loading={submitting} className="review-submit-btn">
            Submit Review
          </Button>
        </form>

        <section className="review-list-section">
          <h2>What others are saying</h2>
          {loading ? (
            <>
              <Skeleton height={70} />
              <Skeleton height={70} />
            </>
          ) : reviews.length === 0 ? (
            <div className="surface-card review-empty">
              <MessageSquareText size={26} strokeWidth={1.8} />
              <p>No reviews yet</p>
              <span>Be the first to share your experience.</span>
            </div>
          ) : (
            <div className="review-list">
              {reviews.map((r) => (
                <div key={r.id} className="surface-card review-item">
                  <div className="review-item-top">
                    <span className="review-item-name">{r.userName || "Anonymous"}</span>
                    <span className="review-item-date">{formatDate(r.created_at)}</span>
                  </div>
                  <div className="review-item-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={14}
                        strokeWidth={0}
                        fill={n <= r.rating ? "var(--color-accent, #f5a623)" : "var(--color-line)"}
                      />
                    ))}
                  </div>
                  <p className="review-item-comment">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Reviews;
