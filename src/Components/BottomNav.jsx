import { NavLink } from "react-router-dom";
import { Home, Volleyball, Coffee, Wallet, History, Star, User } from "lucide-react";
import { useHistoryBadge } from "../contexts/HistoryBadgeContext";
import "./BottomNav.css";

const links = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/booking", label: "Booking", icon: Volleyball },
  { to: "/cafe", label: "Cafe", icon: Coffee },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/history", label: "History", icon: History },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/profile", label: "Profile", icon: User },
];

function BottomNav() {
  const { unseenCount } = useHistoryBadge();

  return (
    <nav className="bottom-nav">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => "bottom-nav-item" + (isActive ? " active" : "")}
        >
          <span className="bottom-nav-icon-wrap">
            <Icon size={22} strokeWidth={2.1} />
            {to === "/history" && unseenCount > 0 && (
              <span className="bottom-nav-badge">{unseenCount}</span>
            )}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;