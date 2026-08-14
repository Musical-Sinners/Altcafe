import { useEffect, useState } from "react";
import { Info, Mail, Phone, MapPin, Save } from "lucide-react";
import { DEFAULT_ABOUT_CONTACT, listenToAboutContact, updateAboutContact } from "../lib/aboutConfig";
import Button from "../Components/Button";
import { useToast } from "../contexts/ToastContext";
import "./Admin.css";

function AdminAboutUs() {
  const { showToast } = useToast();
  const [contact, setContact] = useState(DEFAULT_ABOUT_CONTACT);
  const [form, setForm] = useState(DEFAULT_ABOUT_CONTACT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = listenToAboutContact((data) => {
      setContact(data);
      setForm(data);
    });
    return unsubscribe;
  }, []);

  const isDirty =
    form.phone !== contact.phone || form.email !== contact.email || form.location !== contact.location;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAboutContact(form);
      showToast("About Us contact updated");
    } catch (err) {
      console.error(err);
      showToast("Could not update contact details. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="admin-title">About Us</h1>

      <div className="admin-users-card surface-card">
        <div className="admin-settings-head">
          <div>
            <h2>Support Contact</h2>
            <p>
              The phone number, email, and location shown to every user at the bottom of the About
              Us page. Update it any time — it goes live instantly, no app update needed.
            </p>
          </div>
          <span className="admin-live-pill">
            <Info size={14} strokeWidth={2.2} /> Live
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
          <div>
            <label className="login-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Phone size={14} strokeWidth={2.2} /> Support phone
            </label>
            <input
              type="text"
              className="admin-add-input"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. +91 98838 57132"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="login-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Mail size={14} strokeWidth={2.2} /> Support email
            </label>
            <input
              type="email"
              className="admin-add-input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="e.g. support@example.com"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="login-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <MapPin size={14} strokeWidth={2.2} /> Location
            </label>
            <input
              type="text"
              className="admin-add-input"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Kolkata, India"
              style={{ width: "100%" }}
            />
          </div>

          <Button icon={Save} loading={saving} onClick={handleSave} disabled={!isDirty} style={{ alignSelf: "flex-start" }}>
            Save Contact Info
          </Button>
        </div>
      </div>

      <div className="admin-users-card surface-card" style={{ marginTop: 20 }}>
        <h2>Team</h2>
        <p style={{ color: "var(--color-subtext)", fontSize: 13.5 }}>
          Developer and project manager details shown on the About Us page are set directly in{" "}
          <code>src/pages/AboutUs.jsx</code>.
        </p>
      </div>
    </>
  );
}

export default AdminAboutUs;
