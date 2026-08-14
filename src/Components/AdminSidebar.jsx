import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, Wallet, Gift, Settings, Coffee, MessageSquareText } from "lucide-react";
import "./AdminSidebar.css";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/bookings", label: "Turf", icon: CalendarDays },
  { to: "/admin/cafe", label: "Cafe", icon: Coffee },
  { to: "/admin/wallet", label: "Wallet", icon: Wallet },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { to: "/admin/rewards", label: "Rewards", icon: Gift },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <span>⚽</span> Turf&nbsp;Admin
      </div>
      <nav className="admin-sidebar-nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => "admin-sidebar-link" + (isActive ? " active" : "")}
          >
            <Icon size={18} strokeWidth={2.1} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;