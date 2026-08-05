import { NavLink } from "react-router-dom";
import { Home, Volleyball, Wallet, User } from "lucide-react";
import "./BottomNav.css";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/booking", label: "Booking", icon: Volleyball },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/profile", label: "Profile", icon: User },
];

function BottomNav() {
  return (
    <nav className="bottom-nav">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => "bottom-nav-item" + (isActive ? " active" : "")}
        >
          <Icon size={22} strokeWidth={2.1} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;