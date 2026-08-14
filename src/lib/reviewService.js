// Firestore logic for user reviews. Each user can leave one review per
// category ("cafe" or "turf") — the doc id is deterministic
// (`${uid}_${type}`) so re-submitting just edits their existing review
// instead of creating duplicates.

import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";

const REVIEWS_COLLECTION = "reviews";

export function getReviewDocId(uid, type) {
  return `${uid}_${type}`;
}

/**
 * Saves (or overwrites) a user's review for one category.
 */
export async function submitReview(uid, { type, rating, comment, userName }) {
  await setDoc(doc(db, REVIEWS_COLLECTION, getReviewDocId(uid, type)), {
    uid,
    type,
    rating,
    comment: comment.trim(),
    userName: userName || "",
    created_at: new Date().toISOString(),
  });
}

/**
 * Live-subscribes to every review for one category, most recent first.
 */
export function listenToReviews(type, callback) {
  return onSnapshot(
    query(collection(db, REVIEWS_COLLECTION), where("type", "==", type)),
    (snap) => {
      const reviews = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      callback(reviews);
    }
  );
}

/**
 * Fetches the current user's own review for a category (if any), so the
 * Review page can pre-fill the form when they're editing it.
 */
export async function getOwnReview(uid, type) {
  const snap = await getDoc(doc(db, REVIEWS_COLLECTION, getReviewDocId(uid, type)));
  return snap.exists() ? snap.data() : null;
}

/**
 * Live-subscribes to every review across both categories, most recent
 * first — used by the Admin > Reviews page so admins can see (and
 * moderate) everything in one list.
 */
export function listenToAllReviews(callback) {
  return onSnapshot(collection(db, REVIEWS_COLLECTION), (snap) => {
    const reviews = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    callback(reviews);
  });
}

/**
 * Admin-only: permanently removes a review (e.g. inappropriate or spam
 * feedback). The user can simply resubmit a fresh one afterwards since
 * the doc id is deterministic per user+category.
 */
export async function deleteReview(reviewId) {
  await deleteDoc(doc(db, REVIEWS_COLLECTION, reviewId));
}
