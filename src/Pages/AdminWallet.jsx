import { useEffect, useMemo, useState } from "react";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Volleyball, Coffee, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getAllUsers, getAllWalletTransactions } from "../lib/userService";
import { listenToBookingsSnapshot } from "../lib/bookingService";
import { listenToOrders } from "../lib/cafeService";
import AdminStatCard from "../components/AdminStatCard";
import Skeleton from "../components/Skeleton";
import "./Admin.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function monthKey(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function AdminWallet() {
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  // The turf/cafe income sections only depend on bookings + orders — they
  // shouldn't be stuck behind the (separate, index-dependent) wallet
  // transactions fetch.
  const incomeLoading = bookingsLoading || ordersLoading;
  // (kept implicit via incomeLoading/transactionsLoading below — no
  // single combined `loading` flag needed anymore, so each section can
  // render as soon as its own data is ready.)

  useEffect(() => {
    getAllUsers()
      .then((u) => setUsers(u))
      .catch((err) => console.error("Could not load users for wallet page:", err))
      .finally(() => setUsersLoading(false));

    // Kept separate from getAllUsers() on purpose: this collectionGroup
    // query needs a Firestore composite index the first time it's ever
    // run — if that index isn't set up yet, this call throws. Without
    // its own catch, that error used to reject the whole Promise.all
    // and leave the page stuck on the loading skeleton forever, even
    // though the turf/cafe income below never depended on it.
    getAllWalletTransactions()
      .then((txs) => setTransactions(txs))
      .catch((err) => {
        console.error(
          "Could not load wallet transactions (this usually means a Firestore index still needs to be created — check the browser console for a link from Firebase):",
          err
        );
        setTransactions([]);
      })
      .finally(() => setTransactionsLoading(false));
  }, []);

  // Live listeners (not one-time fetches) so income updates immediately
  // the moment an admin confirms a booking/order elsewhere in the app —
  // no page refresh needed.
  useEffect(() => {
    const unsubscribe = listenToBookingsSnapshot(
      (data) => {
        setBookings(data);
        setBookingsLoading(false);
        setBookingsError(false);
      },
      (err) => {
        console.error("Could not load bookings for wallet page:", err);
        setBookingsError(true);
        setBookingsLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = listenToOrders(
      (data) => {
        setOrders(data);
        setOrdersLoading(false);
        setOrdersError(false);
      },
      (err) => {
        console.error("Could not load orders for wallet page:", err);
        setOrdersError(true);
        setOrdersLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const userLookup = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u.id] = u.name || u.phone || u.email || "—";
    });
    return map;
  }, [users]);

  const totalBalance = users.reduce((sum, u) => sum + (u.wallet_balance || 0), 0);
  const totalCredited = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0);
  const totalDebited = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Income = only bookings/orders an admin has actually confirmed (real
  // money received), same "confirmed" status the Turf/Cafe pages use.
  const confirmedBookings = useMemo(() => bookings.filter((b) => b.status === "confirmed"), [bookings]);
  const confirmedOrders = useMemo(() => orders.filter((o) => o.status === "confirmed"), [orders]);

  const turfIncome = confirmedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const cafeIncome = confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalIncome = turfIncome + cafeIncome;

  const thisMonthKey = monthKey(new Date().toISOString());
  const turfIncomeThisMonth = confirmedBookings
    .filter((b) => monthKey(b.confirmed_at || b.created_at) === thisMonthKey)
    .reduce((sum, b) => sum + (b.price || 0), 0);
  const cafeIncomeThisMonth = confirmedOrders
    .filter((o) => monthKey(o.confirmed_at || o.created_at) === thisMonthKey)
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const monthlyIncome = turfIncomeThisMonth + cafeIncomeThisMonth;

  // Last 6 months of income, split by turf/cafe, for the trend chart.
  const monthlyChartData = useMemo(() => {
    const buckets = {};
    const pushInto = (isoString, field, amount) => {
      const key = monthKey(isoString);
      if (!key) return;
      if (!buckets[key]) buckets[key] = { key, turf: 0, cafe: 0 };
      buckets[key][field] += amount;
    };
    confirmedBookings.forEach((b) => pushInto(b.confirmed_at || b.created_at, "turf", b.price || 0));
    confirmedOrders.forEach((o) => pushInto(o.confirmed_at || o.created_at, "cafe", o.total || 0));

    return Object.values(buckets)
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .slice(-6)
      .map((row) => ({ name: monthLabel(row.key), Turf: row.turf, Cafe: row.cafe }));
  }, [confirmedBookings, confirmedOrders]);

  const incomeSplitData = [
    { name: "Turf", value: turfIncome },
    { name: "Cafe", value: cafeIncome },
  ];

  return (
    <>
      <h1 className="admin-title">Wallet</h1>

      {(bookingsError || ordersError) && (
        <div
          className="surface-card"
          style={{
            padding: 14,
            marginBottom: 16,
            border: "1px solid var(--color-danger, #e5484d)",
            color: "var(--color-danger, #e5484d)",
            fontSize: 13.5,
          }}
        >
          <strong>Turf/Cafe income can't load right now — Firestore is blocking the read.</strong>
          <p style={{ margin: "6px 0 0", color: "var(--color-text)" }}>
            This is a Firestore Security Rules issue, not a bug in the page: the "bookings" and/or "cafe_orders"
            collections aren't readable by the logged-in admin account. Open the Firebase Console → Firestore
            Database → Rules, and make sure admin reads are allowed for those collections, then reload this page.
          </p>
        </div>
      )}

      {incomeLoading ? (
        <Skeleton height={220} />
      ) : (
        <>
          <div className="admin-stat-grid">
            <AdminStatCard icon={TrendingUp} label="Total Income (Turf + Cafe)" value={`₹${totalIncome}`} />
            <AdminStatCard icon={Volleyball} label="Turf Income" value={`₹${turfIncome}`} />
            <AdminStatCard icon={Coffee} label="Cafe Income" value={`₹${cafeIncome}`} />
          </div>

          <div className="admin-stat-grid">
            <AdminStatCard icon={WalletIcon} label="This Month's Income" value={`₹${monthlyIncome}`} />
            <AdminStatCard
              icon={ArrowUpRight}
              label="Wallet Total Credited"
              value={transactionsLoading ? "…" : `₹${totalCredited}`}
            />
            <AdminStatCard
              icon={ArrowDownRight}
              label="Wallet Total Debited"
              value={transactionsLoading ? "…" : `₹${totalDebited}`}
            />
          </div>

          <div className="admin-users-card surface-card" style={{ marginBottom: 20 }}>
            <h2>Monthly Income — Turf vs Cafe</h2>
            {monthlyChartData.length === 0 ? (
              <p style={{ color: "var(--color-subtext)", fontSize: 14 }}>
                No confirmed turf bookings or cafe orders yet — income will show up here once you confirm some.
              </p>
            ) : (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`₹${value}`, undefined]}
                      contentStyle={{ borderRadius: 10, border: "1px solid var(--color-line)", fontSize: 13 }}
                    />
                    <Bar dataKey="Turf" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Cafe" fill="#b5495b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="admin-users-card surface-card" style={{ marginBottom: 20 }}>
            <h2>Income Split</h2>
            {totalIncome === 0 ? (
              <p style={{ color: "var(--color-subtext)", fontSize: 14 }}>No income recorded yet.</p>
            ) : (
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={incomeSplitData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} width={60} />
                    <Tooltip
                      formatter={(value) => [`₹${value}`, undefined]}
                      contentStyle={{ borderRadius: 10, border: "1px solid var(--color-line)", fontSize: 13 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {incomeSplitData.map((entry, index) => (
                        <Cell key={entry.name} fill={index === 0 ? "var(--color-primary)" : "#b5495b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="admin-users-card surface-card">
            <h2>All Transactions ({transactions.length})</h2>
            {transactionsLoading ? (
              <Skeleton height={140} />
            ) : transactions.length === 0 ? (
              <p style={{ color: "var(--color-subtext)", fontSize: 14 }}>
                No wallet transactions yet — referral bonuses will appear here once users start referring friends.
              </p>
            ) : (
              <div className="admin-table-scroll">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{userLookup[tx.uid] || tx.uid}</td>
                      <td>{tx.label}</td>
                      <td>{formatDate(tx.created_at)}</td>
                      <td className={tx.amount >= 0 ? "tone-success" : "tone-danger"}>
                        {tx.amount >= 0 ? "+" : ""}₹{tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default AdminWallet;
