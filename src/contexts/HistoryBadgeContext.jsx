import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { getUserProfile, markHistorySeen } from "../lib/userService";
import { listenToUserBookings } from "../lib/bookingService";
import { listenToUserOrders } from "../lib/cafeService";
import { playNotificationSound } from "../lib/notificationSound";
import { useToast } from "./ToastContext";

const HistoryBadgeContext = createContext({ unseenCount: 0, markSeen: () => {} });

export function useHistoryBadge() {
  return useContext(HistoryBadgeContext);
}

/**
 * Counts booking/order status changes (turf booking confirmed/canceled,
 * cafe order moved to a new phase) that happened after the user last
 * opened the History page — shown as a "1, 2, ..." badge on the History
 * nav link, and paired with a toast + sound the moment each one arrives.
 */
export function HistoryBadgeProvider({ children }) {
  const { showToast } = useToast();
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const uidRef = useRef(null);

  // Tracks phase/status we've already toasted about, so a live listener
  // re-firing (e.g. on reconnect) never repeats a notification.
  const knownBookingStatus = useRef(new Map());
  const knownOrderPhase = useRef(new Map());

  useEffect(() => {
    let unsubBookings = () => {};
    let unsubOrders = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubBookings();
      unsubOrders();
      knownBookingStatus.current.clear();
      knownOrderPhase.current.clear();
      uidRef.current = user?.uid || null;

      if (!user) {
        setLastSeenAt(null);
        setBookings([]);
        setOrders([]);
        return;
      }

      const profile = await getUserProfile(user.uid);
      setLastSeenAt(profile?.history_last_seen_at || null);

      unsubBookings = listenToUserBookings(user.uid, (data) => {
        data.forEach((b) => {
          const prev = knownBookingStatus.current.get(b.id);
          knownBookingStatus.current.set(b.id, b.status);
          if (prev !== undefined && prev !== b.status && b.status !== "pending") {
            const message =
              b.status === "confirmed"
                ? `Turf booking confirmed — ${b.turf} · ${b.time}`
                : `Turf booking cancelled — ${b.turf} · ${b.time}`;
            showToast(message, b.status === "confirmed" ? "success" : "error");
            playNotificationSound();
          }
        });
        setBookings(data);
      });

      unsubOrders = listenToUserOrders(user.uid, (data) => {
        data.forEach((o) => {
          const prev = knownOrderPhase.current.get(o.id);
          knownOrderPhase.current.set(o.id, o.phase);
          if (prev !== undefined && prev !== o.phase) {
            showToast(`Order #${o.token}: ${o.phase === "cancelled" ? "Cancelled" : o.phase}`, "info");
            playNotificationSound();
          }
        });
        setOrders(data);
      });
    });

    return () => {
      unsubAuth();
      unsubBookings();
      unsubOrders();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cutoff = lastSeenAt || "0000-00-00";
  const unseenBookings = bookings.filter(
    (b) => b.status !== "pending" && (b.confirmed_at || b.canceled_at || "") > cutoff
  ).length;
  const unseenOrders = orders.filter(
    (o) => o.phase !== "placed" && (o.status_updated_at || "") > cutoff
  ).length;
  const unseenCount = unseenBookings + unseenOrders;

  const markSeen = () => {
    setLastSeenAt(new Date().toISOString());
    if (uidRef.current) markHistorySeen(uidRef.current).catch(() => {});
  };

  return (
    <HistoryBadgeContext.Provider value={{ unseenCount, markSeen }}>
      {children}
    </HistoryBadgeContext.Provider>
  );
}
