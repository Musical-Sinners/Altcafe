import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../Components/Navbar";
import BottomNav from "../Components/BottomNav";
import Skeleton from "../Components/Skeleton";
import ReviewPromptModal from "../Components/ReviewPromptModal";
import { HistoryBadgeProvider } from "../contexts/HistoryBadgeContext";
import { listenToUserOrders } from "../lib/cafeService";
import { listenToUserBookings } from "../lib/bookingService";

/**
 * Reads which orders/bookings this uid has already been prompted to review,
 * so a completed order or confirmed booking only ever triggers the prompt
 * once — never again on later logins/refreshes.
 */
function getPromptedSet(uid) {
  try {
    const raw = localStorage.getItem(`altcafe_review_prompted_${uid}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function savePromptedSet(uid, set) {
  try {
    localStorage.setItem(`altcafe_review_prompted_${uid}`, JSON.stringify([...set]));
  } catch {
    // localStorage unavailable — the prompt just may repeat, non-critical
  }
}

/**
 * Shared shell for every logged-in-only page (dashboard, cafe, booking,
 * wallet, history, profile, reviews, about-us). Nothing inside <Outlet />
 * ever renders until we've confirmed a user is signed in — this is what
 * stops the Firestore "permission-denied" flood you get when someone
 * loads/refreshes one of these pages while logged out, since our Firestore
 * rules require request.auth != null for every read/write.
 *
 * This is also where we watch, app-wide, for a cafe order turning
 * "completed" or a turf booking turning "confirmed" so we can pop an
 * optional review prompt — no matter which page the person is currently
 * on. See ReviewPromptModal for the form itself.
 */
function AppLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [reviewQueue, setReviewQueue] = useState([]); // [{ type: "cafe" | "turf", id }]

  const seededRef = useRef({ cafe: false, turf: false });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setChecking(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch cafe orders for the "completed" transition.
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (checking || !currentUser) return;
    const uid = currentUser.uid;

    const unsubscribe = listenToUserOrders(uid, (orders) => {
      const prompted = getPromptedSet(uid);
      const completed = orders.filter((o) => (o.phase || (o.status === "done" ? "completed" : null)) === "completed");

      // First snapshot ever for this uid: mark existing completed orders as
      // already-seen so we don't retroactively prompt for order history.
      if (!seededRef.current.cafe) {
        seededRef.current.cafe = true;
        let changed = false;
        completed.forEach((o) => {
          if (!prompted.has(`cafe:${o.id}`)) {
            prompted.add(`cafe:${o.id}`);
            changed = true;
          }
        });
        if (changed) savePromptedSet(uid, prompted);
        return;
      }

      const fresh = completed.filter((o) => !prompted.has(`cafe:${o.id}`));
      if (fresh.length === 0) return;

      fresh.forEach((o) => prompted.add(`cafe:${o.id}`));
      savePromptedSet(uid, prompted);
      setReviewQueue((q) => [...q, ...fresh.map((o) => ({ type: "cafe", id: o.id }))]);
    });
    return () => unsubscribe();
  }, [checking]);

  // Watch turf bookings for the "confirmed" transition.
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (checking || !currentUser) return;
    const uid = currentUser.uid;

    const unsubscribe = listenToUserBookings(uid, (bookings) => {
      const prompted = getPromptedSet(uid);
      const confirmed = bookings.filter((b) => b.status === "confirmed");

      if (!seededRef.current.turf) {
        seededRef.current.turf = true;
        let changed = false;
        confirmed.forEach((b) => {
          if (!prompted.has(`turf:${b.id}`)) {
            prompted.add(`turf:${b.id}`);
            changed = true;
          }
        });
        if (changed) savePromptedSet(uid, prompted);
        return;
      }

      const fresh = confirmed.filter((b) => !prompted.has(`turf:${b.id}`));
      if (fresh.length === 0) return;

      fresh.forEach((b) => prompted.add(`turf:${b.id}`));
      savePromptedSet(uid, prompted);
      setReviewQueue((q) => [...q, ...fresh.map((b) => ({ type: "turf", id: b.id }))]);
    });
    return () => unsubscribe();
  }, [checking]);

  const activePrompt = reviewQueue[0] || null;

  const dismissActivePrompt = () => {
    setReviewQueue((q) => q.slice(1));
  };

  if (checking) {
    return (
      <div className="app-layout">
        <main className="app-layout-main">
          <Skeleton height={40} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <HistoryBadgeProvider>
        <Navbar />
        <main className="app-layout-main">
          <Outlet />
        </main>
        <BottomNav />
      </HistoryBadgeProvider>

      <ReviewPromptModal
        open={!!activePrompt}
        type={activePrompt?.type}
        onClose={dismissActivePrompt}
      />
    </div>
  );
}

export default AppLayout;