import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getAllUsers } from "../lib/userService";
import Skeleton from "../components/Skeleton";
import "./Admin.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.phone, u.email, u.referral_code].some((field) =>
        (field || "").toLowerCase().includes(q)
      )
    );
  }, [users, search]);

  return (
    <>
      <h1 className="admin-title">Users ({users.length})</h1>

      <div className="admin-search-row">
        <Search size={16} strokeWidth={2.2} className="admin-search-icon" />
        <input
          type="text"
          placeholder="Search by name, phone, email, or referral code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search-input"
        />
      </div>

      <div className="admin-users-card surface-card">
        {loading ? (
          <Skeleton height={200} />
        ) : filteredUsers.length === 0 ? (
          <p style={{ color: "var(--color-subtext)", fontSize: 14 }}>
            {users.length === 0 ? "No users have signed up yet." : "No users match your search."}
          </p>
        ) : (
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Referral Code</th>
                <th>Referred By</th>
                <th>Referrals</th>
                <th>Wallet</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || "—"}</td>
                  <td>{u.phone || u.email || "—"}</td>
                  <td>{u.referral_code || "—"}</td>
                  <td>{u.referred_by ? "Yes" : "—"}</td>
                  <td>{u.referral_count || 0}</td>
                  <td>₹{u.wallet_balance || 0}</td>
                  <td>{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default AdminUsers;
