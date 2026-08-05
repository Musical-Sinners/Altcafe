import { useEffect, useMemo, useState } from "react";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getAllUsers, getAllWalletTransactions } from "../lib/userService";
import AdminStatCard from "../components/AdminStatCard";
import Skeleton from "../components/Skeleton";
import "./Admin.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AdminWallet() {
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllUsers(), getAllWalletTransactions()]).then(([u, txs]) => {
      setUsers(u);
      setTransactions(txs);
      setLoading(false);
    });
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

  return (
    <>
      <h1 className="admin-title">Wallet</h1>

      {loading ? (
        <Skeleton height={220} />
      ) : (
        <>
          <div className="admin-stat-grid">
            <AdminStatCard icon={WalletIcon} label="Total Balance Held" value={`₹${totalBalance}`} />
            <AdminStatCard icon={ArrowUpRight} label="Total Credited" value={`₹${totalCredited}`} />
            <AdminStatCard icon={ArrowDownRight} label="Total Debited" value={`₹${totalDebited}`} />
          </div>

          <div className="admin-users-card surface-card">
            <h2>All Transactions ({transactions.length})</h2>
            {transactions.length === 0 ? (
              <p style={{ color: "var(--color-subtext)", fontSize: 14 }}>
                No wallet transactions yet — referral bonuses will appear here once users start referring friends.
              </p>
            ) : (
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
            )}
          </div>
        </>
      )}
    </>
  );
}

export default AdminWallet;
