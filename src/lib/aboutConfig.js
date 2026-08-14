// About Us contact settings (phone / email / location shown at the bottom
// of the About Us page). Stored as a single Firestore doc so admin can
// update it any time without a code change/redeploy — same pattern as
// src/lib/paymentConfig.js.

import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { recordAdminActivity } from "./adminActivity";

export const ABOUT_SETTINGS_DOC = doc(db, "settings", "aboutUs");

export const DEFAULT_ABOUT_CONTACT = {
  phone: "+91 98838 57132",
  email: "altcafe2026@gmail.com",
  location: "Kolkata, India",
};

export function listenToAboutContact(callback) {
  return onSnapshot(ABOUT_SETTINGS_DOC, (snap) => {
    callback(snap.exists() ? { ...DEFAULT_ABOUT_CONTACT, ...snap.data() } : DEFAULT_ABOUT_CONTACT);
  });
}

export async function getAboutContact() {
  const snap = await getDoc(ABOUT_SETTINGS_DOC);
  return snap.exists() ? { ...DEFAULT_ABOUT_CONTACT, ...snap.data() } : DEFAULT_ABOUT_CONTACT;
}

export async function updateAboutContact({ phone, email, location }) {
  await setDoc(
    ABOUT_SETTINGS_DOC,
    {
      phone: phone || "",
      email: email || "",
      location: location || "",
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );

  await recordAdminActivity({
    action: "about-contact-updated",
    title: "About Us contact updated",
    detail: "Support phone, email, or location was changed",
    targetType: "settings",
    targetId: "aboutUs",
    meta: { phone: phone || "", email: email || "", location: location || "" },
  });
}
