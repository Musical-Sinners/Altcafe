import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, History as HistoryIcon, Coffee, MapPin } from "lucide-react";
import { auth } from "../firebase";
import { getWalletTransactions } from "../lib/userService";
import { listenToUserOrders } from "../lib/cafeService";
import { listenToUserBookings, formatBookingDate } from "../lib/bookingService";
import Skeleton from "../components/Skeleton";
import OrderTracker from "../components/OrderTracker";
import "./History.css";

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function History() {
  const [tab, setTab] = useState("cafe"); // "cafe" | "turf"

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const txs = await getWalletTransactions(currentUser.uid);
      setTransactions(txs);
      setLoading(false);
    };
    load();
  }, []);

  // Live so a phase change the admin makes updates this page in real time.
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setOrdersLoading(false);
      return;
    }
    const unsubscribe = listenToUserOrders(currentUser.uid, (data) => {
      setOrders(data);
      setOrdersLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setBookingsLoading(false);
      return;
    }
    const unsubscribe = listenToUserBookings(currentUser.uid, (data) => {
      setBookings(data);
      setBookingsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="history-page">
      <div className="history-inner">
        <h1>History</h1>

        <div className="history-tabs">
          <button
            type="button"
            className={`history-tab ${tab === "cafe" ? "active" : ""}`}
            onClick={() => setTab("cafe")}
          >
            <Coffee size={15} strokeWidth={2.2} /> Cafe
          </button>
          <button
            type="button"
            className={`history-tab ${tab === "turf" ? "active" : ""}`}
            onClick={() => setTab("turf")}
          >
            <MapPin size={15} strokeWidth={2.2} /> Turf
          </button>
        </div>

        {tab === "cafe" ? (
          ordersLoading ? (
            <>
              <Skeleton height={120} />
              <Skeleton height={120} />
            </>
          ) : orders.length === 0 ? (
            <div className="surface-card history-empty">
              <Coffee size={28} strokeWidth={1.8} />
              <p>No cafe orders yet</p>
              <span>Orders you place from the Cafe page, with their token, will show up here.</span>
            </div>
          ) : (
            <div className="history-orders-list">
              {orders.map((order) => (
                <OrderTracker key={order.id} order={order} compact />
              ))}
            </div>
          )
        ) : bookingsLoading ? (
          <>
            <Skeleton height={64} />
            <Skeleton height={64} />
          </>
        ) : bookings.length === 0 ? (
          <div className="surface-card history-empty">
            <MapPin size={28} strokeWidth={1.8} />
            <p>No turf bookings yet</p>
            <span>Turf slots you book will show up here.</span>
          </div>
        ) : (
          <div className="surface-card history-list">
            {bookings.map((b) => (
              <div key={b.id} className="history-row">
                <span className="history-row-icon">
                  <MapPin size={16} strokeWidth={2.2} />
                </span>
                <div className="history-row-body">
                  <span className="history-row-label">
                    {b.turf} · {b.time}
                  </span>
                  <span className="history-row-date">{formatBookingDate(b.day)}</span>
                </div>
                <span className={`history-row-amount ${b.status === "canceled" ? "tone-danger" : "tone-success"}`}>
                  {b.status === "canceled" ? "Canceled" : `₹${b.price}`}
                </span>
              </div>
            ))}
          </div>
        )}

        <h2 className="history-section-title">Activity</h2>

        {loading ? (
          <>
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </>
        ) : transactions.length === 0 ? (
          <div className="surface-card history-empty">
            <HistoryIcon size={28} strokeWidth={1.8} />
            <p>No activity yet</p>
            <span>Bookings, cafe orders, and referral bonuses will show up here.</span>
          </div>
        ) : (
          <div className="surface-card history-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="history-row">
                <span className="history-row-icon">
                  {tx.amount >= 0 ? (
                    <ArrowUpRight size={16} strokeWidth={2.2} />
                  ) : (
                    <ArrowDownRight size={16} strokeWidth={2.2} />
                  )}
                </span>
                <div className="history-row-body">
                  <span className="history-row-label">{tx.label}</span>
                  <span className="history-row-date">{formatDate(tx.created_at)}</span>
                </div>
                <span className={`history-row-amount ${tx.amount >= 0 ? "tone-success" : "tone-danger"}`}>
                  {tx.amount >= 0 ? "+" : ""}₹{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;