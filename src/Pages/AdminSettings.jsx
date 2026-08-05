import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ShieldCheck, PlusCircle, Trash2, Lock, Users2, RefreshCw } from "lucide-react";
import {
  addAdminEmail,
  getAdminEmails,
  isBootstrapAdminEmail,
  listenToAdminEmails,
  removeAdminEmail,
} from "../lib/adminConfig";
import { auth } from "../firebase";
import { REFERRAL_REWARD, NEW_USER_DISCOUNT, MAX_WALLET_REWARD } from "../lib/userService";
import Button from "../components/Button";
import { useToast } from "../contexts/ToastContext";
import "./Admin.css";

function AdminSettings() {
  const { showToast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentAdminEmail, setCurrentAdminEmail] = useState("");

  const canEditAdminAccess = isBootstrapAdminEmail(currentAdminEmail);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentAdminEmail(user?.email || "");
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = listenToAdminEmails((data) => {
      setAdmins(data);
      setLoadingAdmins(false);
    });
    return unsubscribe;
  }, []);
  const selectedAdminCards = admins.filter((admin) => admin.source !== "bootstrap");

  useEffect(() => {
    if (!loadingAdmins && admins.length === 0) {
      getAdminEmails().then(setAdmins).catch(console.error);
    }
  }, [loadingAdmins, admins.length]);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!canEditAdminAccess) {
      showToast("Only the bootstrap admin can edit admin access.", "error");
      return;
    }
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    setSaving(true);
    try {
      await addAdminEmail(email);
      setNewAdminEmail("");
      showToast("Admin added");
    } catch (err) {
      console.error(err);
      if (err.message === "missing-email") {
        showToast("Please enter a valid email.", "error");
      } else {
        showToast("Could not add admin.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = async (email, source) => {
    if (!canEditAdminAccess) {
      showToast("Only the bootstrap admin can edit admin access.", "error");
      return;
    }
    if (source === "bootstrap") {
      showToast("Bootstrap admin cannot be removed.", "error");
      return;
    }
    setSaving(true);
    try {
      await removeAdminEmail(email);
      showToast("Admin removed");
    } catch (err) {
      console.error(err);
      if (err.message === "bootstrap-admin") {
        showToast("Bootstrap admin cannot be removed.", "error");
      } else {
        showToast("Could not remove admin.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="admin-title">Settings</h1>

      <div className="admin-users-card surface-card" style={{ marginBottom: 20 }}>
        <div className="admin-settings-head">
          <div>
            <h2>Admin Access</h2>
            <p>
              Add or remove admin emails here. Bootstrap admin accounts stay locked so you never
              lose access to the panel.
            </p>
          </div>
          <span className="admin-live-pill">
            <Users2 size={14} strokeWidth={2.2} /> {admins.length} admins
          </span>
        </div>

        {canEditAdminAccess ? (
          <form className="admin-add-form" onSubmit={handleAddAdmin}>
            <input
              type="email"
              className="admin-add-input"
              placeholder="Add new admin email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
            />
            <Button type="submit" icon={PlusCircle} loading={saving}>
              Add Admin
            </Button>
          </form>
        ) : (
          <p style={{ color: "var(--color-subtext)", fontSize: 13.5, marginTop: 12 }}>
            Admin access editing is locked. Only <strong>altcafe2026@gmail.com</strong> can add or
            remove admins.
          </p>
        )}

        <div className="admin-settings-list">
          {loadingAdmins ? (
            <div className="admin-settings-row">
              <RefreshCw size={16} strokeWidth={2.2} className="spin" />
              <span>Loading admins...</span>
            </div>
          ) : admins.length === 0 ? (
            <p style={{ color: "var(--color-subtext)", fontSize: 13.5 }}>No admins found.</p>
          ) : (
            admins.map((admin) => (
              <div key={admin.email} className="admin-settings-row admin-settings-row-admin">
                <div className="admin-settings-row-left">
                  <ShieldCheck size={16} strokeWidth={2.2} color="var(--color-primary)" />
                  <div>
                    <strong>{admin.email}</strong>
                    <span>{admin.source === "bootstrap" ? "Bootstrap admin" : "Extra admin"}</span>
                  </div>
                </div>
                {admin.source === "bootstrap" ? (
                  <span className="admin-settings-locked">
                    <Lock size={14} strokeWidth={2.2} /> Locked
                  </span>
                ) : canEditAdminAccess ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => handleRemoveAdmin(admin.email, admin.source)}
                    disabled={saving}
                  >
                    Remove
                  </Button>
                ) : (
                  <span className="admin-settings-locked">
                    <Lock size={14} strokeWidth={2.2} /> Read only
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="admin-users-card surface-card">
        <h2>Referral Program Config</h2>
        <p style={{ color: "var(--color-subtext)", fontSize: 13.5, marginBottom: 14 }}>
          Defined in <code>src/lib/userService.js</code>.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="admin-settings-row">
            <span>Referral bonus (per successful referral)</span>
            <strong>₹{REFERRAL_REWARD}</strong>
          </div>
          <div className="admin-settings-row">
            <span>New user discount (first order)</span>
            <strong>₹{NEW_USER_DISCOUNT}</strong>
          </div>
          <div className="admin-settings-row">
            <span>Max wallet balance cap</span>
            <strong>₹{MAX_WALLET_REWARD}</strong>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminSettings;
