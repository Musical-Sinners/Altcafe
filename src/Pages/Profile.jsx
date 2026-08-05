import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil,
  LogOut,
  Bell,
  CreditCard,
  HelpCircle,
  FileText,
  ChevronRight,
  Trophy,
  CalendarCheck,
  Wallet as WalletIcon,
  Check,
} from "lucide-react";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { useToast } from "../contexts/ToastContext";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState({
    name: "Shadman",
    phone: "+880 1XXX-XXXXXX",
    email: "shadman@example.com",
    memberSince: "Jan 2025",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [form, setForm] = useState({ name: user.name, email: user.email });

  const stats = [
    { icon: Trophy, label: "Referrals", value: 4 },
    { icon: WalletIcon, label: "Total Earned", value: "৳400" },
    { icon: CalendarCheck, label: "Bookings", value: 12 },
  ];

  const menu = [
    { icon: CreditCard, label: "Payment Methods" },
    { icon: Bell, label: "Notifications" },
    { icon: HelpCircle, label: "Help & Support" },
    { icon: FileText, label: "Terms & Privacy" },
  ];

  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const openEdit = () => {
    setForm({ name: user.name, email: user.email });
    setEditOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setUser((u) => ({ ...u, name: form.name.trim() || u.name, email: form.email.trim() }));
    setEditOpen(false);
    showToast("Profile updated");
  };

  const handleLogout = () => {
    setLogoutOpen(false);
    showToast("Logged out", "info");
    navigate("/login");
  };

  return (
    <div className="profile-page">
      <div className="profile-inner">
        <h1>Profile</h1>

        <section className="profile-hero surface-card">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-hero-body">
            <h2 className="profile-name">{user.name}</h2>
            <p className="profile-phone">{user.phone}</p>
            <p className="profile-since">Member since {user.memberSince}</p>
          </div>
          <button className="profile-edit-btn" onClick={openEdit} aria-label="Edit profile">
            <Pencil size={16} strokeWidth={2.2} />
          </button>
        </section>

        <section className="surface-card profile-stats-card">
          {stats.map((s) => (
            <div key={s.label} className="profile-stat">
              <span className="profile-stat-icon">
                <s.icon size={18} strokeWidth={2.1} />
              </span>
              <div>
                <div className="profile-stat-value">{s.value}</div>
                <div className="profile-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="profile-section">
          <h2>Account</h2>
          <div className="surface-card profile-menu-card">
            {menu.map(({ icon: Icon, label }) => (
              <button key={label} className="profile-menu-row" type="button">
                <span className="profile-menu-icon">
                  <Icon size={17} strokeWidth={2.1} />
                </span>
                <span className="profile-menu-label">{label}</span>
                <ChevronRight size={16} strokeWidth={2.2} className="profile-menu-chevron" />
              </button>
            ))}
          </div>
        </section>

        <Button
          variant="danger"
          icon={LogOut}
          className="profile-logout-btn"
          onClick={() => setLogoutOpen(true)}
        >
          Log Out
        </Button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <h2 style={{ marginBottom: 18 }}>Edit Profile</h2>
        <form className="profile-edit-form" onSubmit={handleSave}>
          <label className="profile-form-label" htmlFor="profile-name">Name</label>
          <input
            id="profile-name"
            className="profile-form-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />

          <label className="profile-form-label" htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            className="profile-form-input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />

          <Button type="submit" icon={Check} className="profile-form-submit">
            Save Changes
          </Button>
        </form>
      </Modal>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <h2 style={{ marginBottom: 8 }}>Log Out?</h2>
        <p className="profile-logout-copy">
          You'll need to verify your phone number again to sign back in.
        </p>
        <div className="profile-logout-actions">
          <Button variant="ghost" onClick={() => setLogoutOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" icon={LogOut} onClick={handleLogout}>
            Log Out
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default Profile;