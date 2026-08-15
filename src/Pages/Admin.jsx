import { useEffect, useState } from "react";
import { Wallet, Users, Gift } from "lucide-react";
import { getAllUsers } from "../lib/userService";
import AdminStatCard from "../Components/AdminStatCard";
import Skeleton from "../Components/Skeleton";
import "./Admin.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const totalUsers = users.length;
  const totalReferralRewardsPaid = users.reduce((sum, u) => sum + (u.wallet_balance || 0), 0);
  const totalReferrals = users.reduce((sum, u) => sum + (u.referral_count || 0), 0);
  const recentUsers = users.slice(0, 5);

  return (
    <>
      <h1 className="admin-title">Overview</h1>

      {loading ? (
        <Skeleton height={220} />
      ) : (
        <>
          <div className="admin-stat-grid">
            <AdminStatCard icon={Users} label="Total Users" value={totalUsers} />
            <AdminStatCard icon={Gift} label="Total Referrals" value={totalReferrals} />
            <AdminStatCard icon={Wallet} label="Referral Rewards Paid" value={`₹${totalReferralRewardsPaid}`} />
          </div>

          <div className="admin-users-card surface-card">
            <h2>Recent Users</h2>
            {recentUsers.length === 0 ? (
              <p style={{ color: "var(--color-subtext)", fontSize: 14 }}>No users have signed up yet.</p>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-users-table compact">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Joined</th>
                      <th>Referrals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name || "—"}</td>
                        <td className="admin-cell-wrap">{u.phone || u.email || "—"}</td>
                        <td>{formatDate(u.created_at)}</td>
                        <td>{u.referral_count || 0}</td>
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

export default Admin;