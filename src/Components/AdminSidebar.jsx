import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, Wallet, Gift, Settings, Coffee, MessageSquareText, Info, LogOut } from "lucide-react";
import "./AdminSidebar.css";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/bookings", label: "Turf", icon: CalendarDays },
  { to: "/admin/cafe", label: "Cafe", icon: Coffee },
  { to: "/admin/wallet", label: "Wallet", icon: Wallet },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { to: "/admin/rewards", label: "Rewards", icon: Gift },
  { to: "/admin/about-us", label: "About Us", icon: Info },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminSidebar({ onLogout }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-topbar">
        <div className="admin-sidebar-logo">
          <span>⚽</span> Turf&nbsp;Admin
        </div>
        {/* Only visible on mobile — desktop shows Log Out inside the page header instead. */}
        <button type="button" className="admin-sidebar-mobile-logout" onClick={onLogout}>
          <LogOut size={15} strokeWidth={2.2} />
          Log Out
        </button>
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
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;