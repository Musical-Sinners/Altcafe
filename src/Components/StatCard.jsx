import { NavLink } from "react-router-dom";
import "./StatCard.css";

/**
 * Quick-action tile: icon + label.
 * Pass `to` to navigate to a route, or `onClick` for an in-page action
 * (e.g. scrolling to a section). Used in the Dashboard "Quick Actions" grid.
 */
function StatCard({ to, onClick, icon: Icon, label }) {
  if (!to && onClick) {
    return (
      <button type="button" className="stat-tile" onClick={onClick}>
        <span className="stat-tile-icon">
          <Icon size={22} strokeWidth={2} />
        </span>
        <span className="stat-tile-label">{label}</span>
      </button>
    );
  }

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