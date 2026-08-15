import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { auth } from "../firebase";
import { canAccessAdmin } from "../lib/adminConfig";
import { listenToBookingsSnapshot } from "../lib/bookingService";
import { listenToOrders } from "../lib/cafeService";
import { playNotificationSound } from "../lib/notificationSound";
import { useToast } from "../contexts/ToastContext";
import AdminSidebar from "../Components/AdminSidebar";
import Skeleton from "../Components/Skeleton";
import "../Pages/Admin.css";

/**
 * Shared shell for every /admin/* page: sidebar + the "are you actually
 * the admin" check. Nothing inside <Outlet /> ever renders until this
 * check passes, so no admin-only data flashes on screen for a non-admin
 * before they get redirected.
 */
function AdminLayout() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [checking, setChecking] = useState(true);

  // New-order / new-booking badges + sound. Runs for the whole /admin/*
  // section (not just the Cafe/Turf pages) so the admin hears it and sees
  // the sidebar badge no matter which page they're currently on.
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingBookingCount, setPendingBookingCount] = useState(0);
  const knownOrderIds = useRef(null); // null = "haven't seen the first snapshot yet"
  const knownBookingIds = useRef(null);

  useEffect(() => {
    // Only listen once we've actually confirmed this visitor is the admin —
    // starting these before that would trip Firestore's permission rules
    // for a non-admin who briefly lands on /admin before being redirected.
    if (checking) return;

    const unsubOrders = listenToOrders((orders) => {
      const pending = orders.filter((o) => (o.phase || "placed") === "placed");
      setPendingOrderCount(pending.length);

      const ids = new Set(pending.map((o) => o.id));
      if (knownOrderIds.current !== null) {
        const isNew = [...ids].some((id) => !knownOrderIds.current.has(id));
        if (isNew) playNotificationSound();
      }
      knownOrderIds.current = ids;
    });

    const unsubBookings = listenToBookingsSnapshot((bookings) => {
      const pending = bookings.filter((b) => b.status === "pending");
      setPendingBookingCount(pending.length);

      const ids = new Set(pending.map((b) => b.id));
      if (knownBookingIds.current !== null) {
        const isNew = [...ids].some((id) => !knownBookingIds.current.has(id));
        if (isNew) playNotificationSound();
      }
      knownBookingIds.current = ids;
    });

    return () => {
      unsubOrders();
      unsubBookings();
    };
  }, [checking]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      canAccessAdmin(user.email)
        .then((allowed) => {
          if (!allowed) {
            showToast("You are not admin, please go to Dashboard.", "error");
            navigate("/dashboard");
            return;
          }
          setChecking(false);
        })
        .catch((err) => {
          console.error(err);
          navigate("/dashboard");
        });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (checking) {
    return (
      <div className="admin-shell">
        <div className="admin-main" style={{ width: "100%" }}>
          <Skeleton height={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminSidebar onLogout={handleLogout} pendingOrders={pendingOrderCount} pendingBookings={pendingBookingCount} />
      <main className="admin-main">
        <div className="admin-title-row">
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={16} strokeWidth={2.2} />
            Log Out
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;