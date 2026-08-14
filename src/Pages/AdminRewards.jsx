import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getAllUsers, REFERRAL_REWARD, NEW_USER_DISCOUNT, MAX_WALLET_REWARD } from "../lib/userService";
import AdminStatCard from "../Components/AdminStatCard";
import Skeleton from "../Components/Skeleton";
import "./Admin.css";

function AdminRewards() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const topReferrers = [...users]
    .filter((u) => (u.referral_count || 0) > 0)
    .sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0))
    .slice(0, 10);

  return (
    <>
      <h1 className="admin-title">Rewards</h1>

      <div className="admin-stat-grid">
        <AdminStatCard label="Referral Bonus (per referral)" value={`₹${REFERRAL_REWARD}`} />
        <AdminStatCard label="New User Discount" value={`₹${NEW_USER_DISCOUNT}`} />
        <AdminStatCard label="Max Wallet Cap" value={`₹${MAX_WALLET_REWARD}`} />
      </div>
      <p style={{ color: "var(--color-subtext)", fontSize: 13, marginTop: -12, marginBottom: 24 }}>
        These values are set in code (src/lib/userService.js) — changing them here isn't wired up yet.
      </p>

      <div className="admin-users-card surface-card">
        <h2>Top Referrers</h2>
        {loading ? (
          <Skeleton height={160} />
        ) : topReferrers.length === 0 ? (
          <div className="admin-empty-state">
            <Trophy size={26} strokeWidth={1.8} />
            <p>No referrals yet</p>
            <span>Once users start inviting friends, the top referrers will show up here.</span>
          </div>
        ) : (
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Referral Code</th>
                <th>Referrals</th>
                <th>Wallet Balance</th>
              </tr>
            </thead>
            <tbody>
              {topReferrers.map((u, i) => (
                <tr key={u.id}>
                  <td>#{i + 1}</td>
                  <td>{u.name || u.phone || u.email || "—"}</td>
                  <td>{u.referral_code || "—"}</td>
                  <td>{u.referral_count}</td>
                  <td>₹{u.wallet_balance || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default AdminRewards;
