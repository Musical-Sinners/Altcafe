import { NavLink } from "react-router-dom";
import "./StatCard.css";

/**
 * Quick-action tile: icon + label, links somewhere.
 * Used in the Dashboard "Quick Actions" grid.
 */
function StatCard({ to, icon: Icon, label }) {
  return (
    <NavLink to={to} className="stat-tile">
      <span className="stat-tile-icon">
        <Icon size={22} strokeWidth={2} />
      </span>
      <span className="stat-tile-label">{label}</span>
    </NavLink>
  );
}

export default StatCard;