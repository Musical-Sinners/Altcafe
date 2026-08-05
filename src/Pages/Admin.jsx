import { CalendarDays, Wallet, Users, Gift } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AdminSidebar from "../components/AdminSidebar";
import AdminStatCard from "../components/AdminStatCard";
import "./Admin.css";

const weeklyRevenue = [
  { day: "Mon", revenue: 4200 },
  { day: "Tue", revenue: 3800 },
  { day: "Wed", revenue: 5100 },
  { day: "Thu", revenue: 4600 },
  { day: "Fri", revenue: 6200 },
  { day: "Sat", revenue: 8900 },
  { day: "Sun", revenue: 7400 },
];

const recentUsers = [
  { name: "Rakib Hasan", joined: "2 hours ago", referrals: 2 },
  { name: "Nabila Karim", joined: "5 hours ago", referrals: 0 },
  { name: "Farhan Ahmed", joined: "1 day ago", referrals: 12 },
  { name: "Mim Akter", joined: "1 day ago", referrals: 3 },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-chart-tooltip">
      <p>{label}</p>
      <strong>৳{payload[0].value.toLocaleString()}</strong>
    </div>
  );
}

function Admin() {
  return (
    <div className="admin-shell">
      <AdminSidebar />

      <main className="admin-main">
        <h1 className="admin-title">Overview</h1>

        <div className="admin-stat-grid">
          <AdminStatCard icon={CalendarDays} label="Today's Bookings" value="18" trend="+12%" />
          <AdminStatCard icon={Wallet} label="Today's Revenue" value="৳8,900" trend="+8%" />
          <AdminStatCard icon={Users} label="Total Users" value="1,204" trend="+3%" />
          <AdminStatCard icon={Gift} label="Referral Rewards" value="৳24,600" trend="-2%" trendUp={false} />
        </div>

        <div className="admin-chart-card surface-card">
          <div className="admin-chart-head">
            <h2>Revenue — Last 7 Days</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyRevenue}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f5132" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0f5132" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e6ede8" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#7a7a7a" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#7a7a7a" }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#0f5132" strokeWidth={2.5} fill="url(#revenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-users-card surface-card">
          <h2>Recent Users</h2>
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Joined</th>
                <th>Referrals</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.name}>
                  <td>{u.name}</td>
                  <td>{u.joined}</td>
                  <td>{u.referrals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default Admin;