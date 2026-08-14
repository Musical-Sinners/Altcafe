import { useEffect, useMemo, useState } from "react";
import { Coffee, MessageSquareText, Star, Trash2, Volleyball } from "lucide-react";
import { deleteReview, listenToAllReviews } from "../lib/reviewService";
import Skeleton from "../components/Skeleton";
import { useToast } from "../contexts/ToastContext";
import "./Admin.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Stars({ rating }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          strokeWidth={0}
          fill={n <= rating ? "var(--color-accent, #f5a623)" : "var(--color-line)"}
        />
      ))}
    </span>
  );
}

function AdminReviews() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "cafe" | "turf"
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const unsubscribe = listenToAllReviews((data) => {
      setReviews(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const cafeReviews = useMemo(() => reviews.filter((r) => r.type === "cafe"), [reviews]);
  const turfReviews = useMemo(() => reviews.filter((r) => r.type === "turf"), [reviews]);
  const visibleReviews = filter === "all" ? reviews : filter === "cafe" ? cafeReviews : turfReviews;

  const average = (list) => (list.length ? (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1) : "—");

  const handleDelete = async (review) => {
    if (!window.confirm(`Remove this review by ${review.userName || "this user"}? This can't be undone.`)) return;
    setDeletingId(review.id);
    try {
      await deleteReview(review.id);
      showToast("Review removed");
    } catch (err) {
      console.error(err);
      showToast("Could not remove review.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <h1 className="admin-title">Reviews ({reviews.length})</h1>

      <div className="admin-stat-grid">
        <div className="admin-stat-card surface-card">
          <div className="admin-stat-top">
            <span className="admin-stat-icon">
              <MessageSquareText size={18} strokeWidth={2.1} />
            </span>
          </div>
          <p className="admin-stat-value">{reviews.length}</p>
          <p className="admin-stat-label">Total Reviews</p>
        </div>
        <div className="admin-stat-card surface-card">
          <div className="admin-stat-top">
            <span className="admin-stat-icon">
              <Coffee size={18} strokeWidth={2.1} />
            </span>
          </div>
          <p className="admin-stat-value">
            {average(cafeReviews)} <span style={{ fontSize: 14, color: "var(--color-subtext)" }}>({cafeReviews.length})</span>
          </p>
          <p className="admin-stat-label">Cafe Avg Rating</p>
        </div>
        <div className="admin-stat-card surface-card">
          <div className="admin-stat-top">
            <span className="admin-stat-icon">
              <Volleyball size={18} strokeWidth={2.1} />
            </span>
          </div>
          <p className="admin-stat-value">
            {average(turfReviews)} <span style={{ fontSize: 14, color: "var(--color-subtext)" }}>({turfReviews.length})</span>
          </p>
          <p className="admin-stat-label">Turf Avg Rating</p>
        </div>
      </div>

      <div className="admin-users-card surface-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>All Reviews ({visibleReviews.length})</h2>
          <div className="admin-filter-pills">
            <button
              type="button"
              className={`admin-filter-pill ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`admin-filter-pill ${filter === "cafe" ? "active" : ""}`}
              onClick={() => setFilter("cafe")}
            >
              <Coffee size={13} strokeWidth={2.2} style={{ marginRight: 4, verticalAlign: -2 }} /> Cafe
            </button>
            <button
              type="button"
              className={`admin-filter-pill ${filter === "turf" ? "active" : ""}`}
              onClick={() => setFilter("turf")}
            >
              <Volleyball size={13} strokeWidth={2.2} style={{ marginRight: 4, verticalAlign: -2 }} /> Turf
            </button>
          </div>
        </div>

        {loading ? (
          <Skeleton height={200} />
        ) : visibleReviews.length === 0 ? (
          <div className="admin-empty-state">
            <MessageSquareText size={26} strokeWidth={1.8} />
            <p>No reviews yet</p>
            <span>Reviews users leave on the Reviews page will show up here.</span>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Category</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleReviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.userName || "Anonymous"}</td>
                    <td style={{ textTransform: "capitalize" }}>{r.type}</td>
                    <td>
                      <Stars rating={r.rating} />
                    </td>
                    <td className="admin-cell-wrap" title={r.comment}>
                      {r.comment}
                    </td>
                    <td>{formatDate(r.created_at)}</td>
                    <td className="admin-cell-actions">
                      <button
                        type="button"
                        className="danger"
                        title="Remove review"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r)}
                        style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-danger)" }}
                      >
                        <Trash2 size={16} strokeWidth={2.1} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default AdminReviews;
