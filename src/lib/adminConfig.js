import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { recordAdminActivity } from "./adminActivity";

/**
 * Bootstrap admin account. This email always stays admin so the panel can't
 * lock itself out if the Firestore admin list is emptied.
 */
export const ADMIN_EMAILS = ["altcafe2026@gmail.com"];

export const ADMIN_COLLECTION = "admins";

export function normalizeAdminEmail(email) {
  return (email || "").trim().toLowerCase();
}

export function isBootstrapAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(normalizeAdminEmail(email));
}

export async function canAccessAdmin(email) {
  if (isBootstrapAdminEmail(email)) return true;
  const adminEmail = normalizeAdminEmail(email);
  if (!adminEmail) return false;
  const snap = await getDoc(doc(db, ADMIN_COLLECTION, adminEmail));
  return snap.exists();
}

export async function getAdminEmails() {
  const snap = await getDocs(collection(db, ADMIN_COLLECTION));
  const firestoreAdmins = snap.docs
    .map((d) => ({
      id: d.id,
      email: normalizeAdminEmail(d.data().email || d.id),
      source: "custom",
      created_at: d.data().created_at || null,
    }))
    .filter((admin) => admin.email);

  const bootstrapAdmins = ADMIN_EMAILS.map((email) => ({
    id: normalizeAdminEmail(email),
    email: normalizeAdminEmail(email),
    source: "bootstrap",
    created_at: null,
  }));

  const merged = new Map();
  [...bootstrapAdmins, ...firestoreAdmins].forEach((admin) => merged.set(admin.email, admin));
  return [...merged.values()];
}

export function listenToAdminEmails(callback) {
  return onSnapshot(collection(db, ADMIN_COLLECTION), (snap) => {
    const firestoreAdmins = snap.docs
      .map((d) => ({
        id: d.id,
        email: normalizeAdminEmail(d.data().email || d.id),
        source: "custom",
        created_at: d.data().created_at || null,
      }))
      .filter((admin) => admin.email);

    const bootstrapAdmins = ADMIN_EMAILS.map((email) => ({
      id: normalizeAdminEmail(email),
      email: normalizeAdminEmail(email),
      source: "bootstrap",
      created_at: null,
    }));

    const merged = new Map();
    [...bootstrapAdmins, ...firestoreAdmins].forEach((admin) => merged.set(admin.email, admin));
    callback([...merged.values()]);
  });
}

export async function addAdminEmail(email) {
  const normalized = normalizeAdminEmail(email);
  if (!normalized) throw new Error("missing-email");
  await setDoc(doc(db, ADMIN_COLLECTION, normalized), {
    email: normalized,
    created_at: new Date().toISOString(),
  });
  await recordAdminActivity({
    action: "admin-added",
    title: "Admin added",
    detail: `${normalized} was granted admin access`,
    targetType: "admin",
    targetId: normalized,
    meta: { email: normalized },
  });
}

export async function removeAdminEmail(email) {
  const normalized = normalizeAdminEmail(email);
  if (!normalized) throw new Error("missing-email");
  if (isBootstrapAdminEmail(normalized)) throw new Error("bootstrap-admin");
  await deleteDoc(doc(db, ADMIN_COLLECTION, normalized));
  await recordAdminActivity({
    action: "admin-removed",
    title: "Admin removed",
    detail: `${normalized} lost admin access`,
    targetType: "admin",
    targetId: normalized,
    meta: { email: normalized },
  });
}
