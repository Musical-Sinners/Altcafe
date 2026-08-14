import { NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Coffee, Wallet, History, Star, User } from "lucide-react";
import "./Navbar.css";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/booking", label: "Book Turf", icon: CalendarDays },
  { to: "/cafe", label: "Cafe", icon: Coffee },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/history", label: "History", icon: History },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/profile", label: "Profile", icon: User },
];

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo">
          <span className="navbar-logo-mark">⚽</span>
          <span>Turf&nbsp;Club</span>
        </div>

        <nav className="navbar-links">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
            >
              <Icon size={17} strokeWidth={2.2} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;