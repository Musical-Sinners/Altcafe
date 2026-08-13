// Payment settings (currently just the QR code shown for "Pay via QR" at
// checkout — turf booking + cafe orders). Stored as a single Firestore doc
// so admin can swap the QR image any time without a code change/redeploy.
//
// The image is kept as a base64 data URL directly on the doc (small PNG/JPG,
// comfortably under Firestore's 1MB doc limit) rather than in Firebase
// Storage, since Storage isn't wired up in this project yet.

import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { recordAdminActivity } from "./adminActivity";
import defaultQrImage from "../assets/payment-qr-default.jpg";

export const PAYMENT_SETTINGS_DOC = doc(db, "settings", "payment");

// Shown until the admin uploads a replacement — this is the PhonePe QR
// provided when the project was set up.
export const DEFAULT_PAYMENT_QR = {
  qrImageUrl: defaultQrImage,
  payeeName: "MD AKRAM ISLAM MOLLA",
  provider: "PhonePe",
};

export function listenToPaymentConfig(callback) {
  return onSnapshot(PAYMENT_SETTINGS_DOC, (snap) => {
    callback(snap.exists() ? { ...DEFAULT_PAYMENT_QR, ...snap.data() } : DEFAULT_PAYMENT_QR);
  });
}

export async function getPaymentConfig() {
  const snap = await getDoc(PAYMENT_SETTINGS_DOC);
  return snap.exists() ? { ...DEFAULT_PAYMENT_QR, ...snap.data() } : DEFAULT_PAYMENT_QR;
}

/**
 * Reads a File (from an <input type="file">) into a base64 data URL.
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

export async function updatePaymentQr({ qrImageUrl, payeeName, provider }) {
  if (!qrImageUrl) throw new Error("missing-qr-image");
  await setDoc(
    PAYMENT_SETTINGS_DOC,
    {
      qrImageUrl,
      payeeName: payeeName || "",
      provider: provider || "",
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );

  await recordAdminActivity({
    action: "payment-qr-updated",
    title: "Payment QR updated",
    detail: `Payment QR code was changed${payeeName ? ` (${payeeName})` : ""}`,
    targetType: "settings",
    targetId: "payment",
    meta: { payeeName: payeeName || "", provider: provider || "" },
  });
}
