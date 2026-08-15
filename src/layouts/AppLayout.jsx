import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../Components/Navbar";
import BottomNav from "../Components/BottomNav";
import Skeleton from "../Components/Skeleton";
import { HistoryBadgeProvider } from "../contexts/HistoryBadgeContext";

/**
 * Shared shell for every logged-in-only page (dashboard, cafe, booking,
 * wallet, history, profile, reviews, about-us). Nothing inside <Outlet />
 * ever renders until we've confirmed a user is signed in — this is what
 * stops the Firestore "permission-denied" flood you get when someone
 * loads/refreshes one of these pages while logged out, since our Firestore
 * rules require request.auth != null for every read/write.
 */
function AppLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

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
    </div>
  );
}

export default AppLayout;