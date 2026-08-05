import { ShieldCheck } from "lucide-react";
import { ADMIN_EMAILS } from "../lib/adminConfig";
import { REFERRAL_REWARD, NEW_USER_DISCOUNT, MAX_WALLET_REWARD } from "../lib/userService";
import "./Admin.css";

function AdminSettings() {
  return (
    <>
      <h1 className="admin-title">Settings</h1>

      <div className="admin-users-card surface-card" style={{ marginBottom: 20 }}>
        <h2>Admin Access</h2>
        <p style={{ color: "var(--color-subtext)", fontSize: 13.5, marginBottom: 14 }}>
          Only these accounts can open the Admin panel. To add another admin right now, a
          developer needs to add the email to <code>src/lib/adminConfig.js</code> and redeploy —
          managing this list from here isn't wired up yet.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ADMIN_EMAILS.map((email) => (
            <div key={email} className="admin-settings-row">
              <ShieldCheck size={16} strokeWidth={2.2} color="var(--color-primary)" />
              <span>{email}</span>
            </div>
          ))}
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
