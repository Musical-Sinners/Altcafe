import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
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
  Copy,
  Share2,
  Link2,
  Info,
  Gift,
} from "lucide-react";
import { auth } from "../firebase";
import { getUserProfile, updateUserProfile } from "../lib/userService";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Skeleton from "../components/Skeleton";
import { useToast } from "../contexts/ToastContext";
import "./Profile.css";

function formatMemberSince(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function Profile() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    const load = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const profile = await getUserProfile(currentUser.uid);
      setUser({
        name: profile?.name || currentUser.displayName || "",
        phone: profile?.phone || "",
        email: profile?.email || currentUser.email || "",
        memberSince: profile?.created_at,
        walletBalance: profile?.wallet_balance || 0,
        referralCount: profile?.referral_count || 0,
        referralCode: profile?.referral_code || "",
      });
      setLoading(false);
    };
    load();
  }, []);

  const referralLink = user?.referralCode
    ? `${window.location.origin}/login?ref=${user.referralCode}`
    : "";

  const handleCopyReferralCode = async () => {
    if (!user?.referralCode) return;
    await navigator.clipboard.writeText(user.referralCode);
    setReferralCopied(true);
    showToast("Referral code copied");
    setTimeout(() => setReferralCopied(false), 1600);
  };

  const handleCopyReferralLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    showToast("Referral link copied");
  };

  const menu = [
    {
      icon: CreditCard,
      label: "Payment Methods",
      onClick: () => showToast("Payment methods page coming soon"),
    },
    {
      icon: Bell,
      label: "Notifications",
      onClick: () => showToast("Notification settings coming soon"),
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      onClick: () => navigate("/about-us"),
    },
    {
      icon: FileText,
      label: "Terms & Privacy",
      onClick: () => showToast("Terms & Privacy page coming soon"),
    },
    {
      icon: Info,
      label: "About Us",
      onClick: () => navigate("/about-us"),
    },
  ];

  const openEdit = () => {
    setForm({ name: user.name, email: user.email });
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setSaving(true);
    try {
      const name = form.name.trim() || user.name;
      const email = form.email.trim();
      await updateUserProfile(currentUser.uid, { name, email });
      setUser((u) => ({ ...u, name, email }));
      setEditOpen(false);
      showToast("Profile updated");
    } catch (err) {
      console.error(err);
      showToast("Could not update profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setLogoutOpen(false);
    showToast("Logged out", "info");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-inner">
          <Skeleton height={100} />
          <div style={{ marginTop: 20 }}>
            <Skeleton height={90} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-inner">
          <p>Couldn't load your profile. Please try logging in again.</p>
        </div>
      </div>
    );
  }

  const stats = [
    { icon: Trophy, label: "Referrals", value: user.referralCount },
    { icon: WalletIcon, label: "Wallet Balance", value: `₹${user.walletBalance}` },
    { icon: CalendarCheck, label: "Bookings", value: 0 },
  ];

  const displayName = user.name || user.phone || user.email || "there";
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-inner">
        <h1>Profile</h1>

        <section className="profile-hero surface-card">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-hero-body">
            <h2 className="profile-name">{displayName}</h2>
            {user.phone && <p className="profile-phone">{user.phone}</p>}
            {!user.phone && user.email && <p className="profile-phone">{user.email}</p>}
            <p className="profile-since">Member since {formatMemberSince(user.memberSince)}</p>
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

        <section className="surface-card profile-referral-card">
          <div className="profile-referral-top">
            <div className="profile-referral-head">
              <span className="profile-referral-icon">
                <Gift size={18} strokeWidth={2.1} />
              </span>
              <div>
                <h2>Invite Friends</h2>
                <p>Share your referral code and earn when they join.</p>
              </div>
            </div>
            <span className="profile-referral-pill">Live</span>
          </div>

          <div className="profile-referral-block">
            <span className="profile-referral-label">Referral Code</span>
            <div className="profile-referral-value-row">
              <span className="profile-referral-value">{user.referralCode || "—"}</span>
              <button type="button" className="profile-inline-copy" onClick={handleCopyReferralCode}>
                <Copy size={16} strokeWidth={2.2} />
                {referralCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="profile-referral-link">
            <Link2 size={16} strokeWidth={2.1} />
            <span>{referralLink || "Referral link will appear after your profile loads."}</span>
          </div>

          <div className="profile-referral-actions">
            <Button size="sm" variant="ghost" icon={Copy} onClick={handleCopyReferralCode}>
              Copy Code
            </Button>
            <Button size="sm" variant="secondary" icon={Share2} onClick={handleCopyReferralLink}>
              Copy Link
            </Button>
          </div>
        </section>

        <section className="profile-section">
          <h2>Account</h2>
          <div className="surface-card profile-menu-card">
            {menu.map(({ icon: Icon, label, onClick }) => (
              <button key={label} className="profile-menu-row" type="button" onClick={onClick}>
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

          <Button type="submit" icon={Check} className="profile-form-submit" loading={saving}>
            Save Changes
          </Button>
        </form>
      </Modal>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <h2 style={{ marginBottom: 8 }}>Log Out?</h2>
        <p className="profile-logout-copy">
          You'll need to sign in again next time.
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
