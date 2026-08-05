import "./AdminStatCard.css";

function AdminStatCard({ icon: Icon, label, value, trend, trendUp = true }) {
  return (
    <div className="admin-stat-card surface-card">
      <div className="admin-stat-top">
        {Icon && (
          <span className="admin-stat-icon">
            <Icon size={18} strokeWidth={2.1} />
          </span>
        )}
        {trend && (
          <span className={`admin-stat-trend ${trendUp ? "up" : "down"}`}>{trend}</span>
        )}
      </div>
      <p className="admin-stat-value">{value}</p>
      <p className="admin-stat-label">{label}</p>
    </div>
  );
}

export default AdminStatCard;