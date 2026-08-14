// Firestore logic for the Cafe: the menu itself (now admin-editable,
// instead of a hardcoded list) and the orders users place.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

const MENU_COLLECTION = "cafe_menu";
const ORDERS_COLLECTION = "cafe_orders";
// Single doc that tracks "today's last token" so tokens can be handed out
// atomically (no two orders ever get the same number) and reset on their own.
const TOKEN_COUNTER_DOC = doc(db, "cafe_meta", "token_counter");
const MAX_TOKEN = 1000;

/**
 * Order lifecycle. Admin moves an order forward through these phases;
 * the user sees the same phase live via listenToOrder / listenToUserOrders.
 */
export const ORDER_PHASES = ["placed", "accepted", "preparing", "ready", "completed"];
export const ORDER_PHASE_LABELS = {
  placed: "Order Placed",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  completed: "Completed",
};
// Shown as the "waiting on X" line while cancelled isn't itself a step.
export const CANCELLED_PHASE = "cancelled";

function todayKey() {
  // Local calendar date (not UTC) so the token resets at local midnight.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Atomically hands out the next daily token: 1-1000, wrapping back to 1
 * either when 1000 is exceeded or when the calendar date has rolled over
 * since the last order. Runs inside the same transaction as createOrder
 * so two simultaneous orders can never collide on the same token.
 */
async function claimNextToken(transaction) {
  const counterSnap = await transaction.get(TOKEN_COUNTER_DOC);
  const today = todayKey();
  const data = counterSnap.exists() ? counterSnap.data() : null;

  let nextToken = 1;
  if (data && data.date === today && Number.isFinite(data.lastToken)) {
    nextToken = data.lastToken >= MAX_TOKEN ? 1 : data.lastToken + 1;
  }

  transaction.set(TOKEN_COUNTER_DOC, { date: today, lastToken: nextToken });
  return nextToken;
}
// A single marker doc that records "the menu has been seeded at least
// once". Without this, deleting every menu item would make the
// collection empty again, and ensureMenuSeeded() would think it's a
// fresh project and re-insert the whole seed list on next page load.

export const CAFE_CATEGORIES = ["Coffee", "Tea", "Snacks", "Desserts"];

// The menu that used to be hardcoded in Cafe.jsx. Used once, only to seed
// Firestore the first time this app runs against a fresh project — after
// that, everything comes from Firestore and this array is never read again.
const SEED_MENU = [
  { name: "Cold Brew", category: "Coffee", price: 120, icon: "☕", desc: "Slow-steeped, smooth & bold", popular: true },
  { name: "Cappuccino", category: "Coffee", price: 150, icon: "☕", desc: "Espresso, steamed milk, foam" },
  { name: "Americano", category: "Coffee", price: 110, icon: "☕", desc: "Espresso, hot water" },
  { name: "Caramel Latte", category: "Coffee", price: 160, icon: "☕", desc: "Espresso, milk, caramel syrup", popular: true },
  { name: "Masala Chai", category: "Tea", price: 60, icon: "🍵", desc: "Spiced milk tea" },
  { name: "Green Tea", category: "Tea", price: 70, icon: "🍵", desc: "Light & antioxidant-rich" },
  { name: "Lemon Iced Tea", category: "Tea", price: 90, icon: "🧊", desc: "Chilled, citrusy, refreshing" },
  { name: "Club Sandwich", category: "Snacks", price: 180, icon: "🥪", desc: "Triple-decker, chicken & egg", popular: true },
  { name: "French Fries", category: "Snacks", price: 120, icon: "🍟", desc: "Crispy, salted, served hot" },
  { name: "Chicken Wrap", category: "Snacks", price: 200, icon: "🌯", desc: "Grilled chicken, house sauce" },
  { name: "Chocolate Brownie", category: "Desserts", price: 150, icon: "🍫", desc: "Fudgy, warm, served with ice cream" },
  { name: "Cheesecake Slice", category: "Desserts", price: 180, icon: "🍰", desc: "Classic New York style" },
  { name: "Blueberry Muffin", category: "Desserts", price: 110, icon: "🧁", desc: "Soft, bakery-fresh" },
];

/**
 * Seeds the cafe menu into Firestore the very first time ever, so
 * upgrading to the admin-managed menu doesn't wipe out the existing items.
 * Uses a marker doc (not "is the collection empty") so that deleting every
 * item later doesn't cause it to silently come back on next page load.
 */
export async function ensureMenuSeeded() {
  const markerRef = doc(db, "cafe_meta", "seed_status");
  const markerSnap = await getDoc(markerRef);
  if (markerSnap.exists()) return;

  // Migration safety: if items already exist (from before this marker
  // doc existed), just record the marker — don't re-insert the seed list
  // on top of real data.
  const existing = await getDocs(collection(db, MENU_COLLECTION));
  if (!existing.empty) {
    await setDoc(markerRef, { seeded_at: new Date().toISOString(), migrated: true });
    return;
  }

  const batch = writeBatch(db);
  SEED_MENU.forEach((item) => {
    const ref = doc(collection(db, MENU_COLLECTION));
    batch.set(ref, { ...item, available: true, created_at: new Date().toISOString() });
  });
  batch.set(markerRef, { seeded_at: new Date().toISOString() });
  await batch.commit();
}

/**
 * Live-subscribes to the full menu (available AND unavailable items —
 * the Cafe page decides how to display unavailable ones).
 */
export function listenToMenu(callback) {
  return onSnapshot(query(collection(db, MENU_COLLECTION), orderBy("category")), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addMenuItem({ name, category, price, desc, icon, image }) {
  await addDoc(collection(db, MENU_COLLECTION), {
    name: name.trim(),
    category,
    price: Number(price),
    desc: desc.trim(),
    icon: icon || "🍽️",
    image: image || "",
    available: true,
    created_at: new Date().toISOString(),
  });
}

export async function updateMenuItem(id, updates) {
  await updateDoc(doc(db, MENU_COLLECTION, id), updates);
}

/**
 * Uploads a menu item photo to imgbb (free image host) and returns its
 * public direct-image URL. Needs a free imgbb API key — get one at
 * https://api.imgbb.com/ and put it in .env as VITE_IMGBB_API_KEY.
 */
export async function uploadMenuItemImage(file) {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing VITE_IMGBB_API_KEY in .env — get a free key from https://api.imgbb.com/ and add it there."
    );
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });
  const result = await response.json();

  if (!response.ok || !result?.data?.url) {
    throw new Error(result?.error?.message || "Image upload failed");
  }

  return result.data.url;
}

export async function setMenuItemAvailability(id, available) {
  await updateDoc(doc(db, MENU_COLLECTION, id), { available });
}

export async function deleteMenuItem(id) {
  await deleteDoc(doc(db, MENU_COLLECTION, id));
}

/**
 * Admin-only: wipes every menu item at once (e.g. clearing seed/demo data
 * before going live). Does NOT touch the seed marker, so ensureMenuSeeded()
 * won't re-insert the old seed list afterwards — the menu just stays empty
 * until the admin adds real items.
 */
export async function deleteAllMenuItems() {
  const snap = await getDocs(collection(db, MENU_COLLECTION));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/**
 * Saves a placed cafe order so the Admin panel can see it, and hands it a
 * unique daily token (1-1000, resets every day / after 1000) in the same
 * transaction so the order and its token are always created together.
 * The wallet debit itself is still handled separately via
 * addWalletTransaction — this is just the order record.
 *
 * An order's `status` (payment confirmation: "pending" | "confirmed") is
 * separate from its `phase` (kitchen workflow: placed/accepted/...). Every
 * new order starts as `status: "pending"` — cash orders wait for an admin
 * to confirm the cash was received, and QR orders wait for an admin to
 * check the customer-supplied transaction ID against the payment. Only an
 * admin can move an order to "confirmed"; there's no customer-facing way
 * to do it.
 */
export async function createOrder(uid, { items, total, walletCreditApplied, userName, userContact, paymentMethod, transactionId, location }) {
  const orderRef = doc(collection(db, ORDERS_COLLECTION));

  const token = await runTransaction(db, async (transaction) => {
    const tokenNumber = await claimNextToken(transaction);
    transaction.set(orderRef, {
      uid,
      items, // [{ name, qty, price }]
      total,
      walletCreditApplied: walletCreditApplied || 0,
      userName: userName || "",
      userContact: userContact || "",
      paymentMethod: paymentMethod || "cash",
      transactionId: paymentMethod === "qr" ? transactionId || "" : "",
      status: "pending", // payment confirmation state — see doc comment above
      // Where the customer is: { type: "table"|"standing"|"turf", table: number|null }
      location: location || null,
      token: tokenNumber,
      phase: "placed", // see ORDER_PHASES
      estimatedMinutes: 10, // admin can revise this as the order moves along
      created_at: new Date().toISOString(),
      status_updated_at: new Date().toISOString(),
    });
    return tokenNumber;
  });

  return { id: orderRef.id, token };
}

/**
 * Admin-only action: moves a pending order to "confirmed". There is no
 * customer-facing equivalent — a user can never confirm their own order,
 * cash or QR.
 */
export async function confirmOrder(orderId) {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
  });
}

/**
 * Live-subscribes to every cafe order, most recent first — used by the
 * Admin panel's Cafe > Orders tab.
 */
export function listenToOrders(callback, onError) {
  return onSnapshot(
    query(collection(db, ORDERS_COLLECTION), orderBy("created_at", "desc")),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    onError
  );
}

/**
 * Fetches every cafe order, most recent first — used by the Admin >
 * Wallet page to total up cafe income.
 */
export async function getAllOrders() {
  const snap = await getDocs(query(collection(db, ORDERS_COLLECTION), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Admin-only: permanently deletes a single order doc (used for clearing
 * out cancelled orders once they're no longer needed).
 */
export async function deleteOrder(orderId) {
  await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
}

/**
 * Admin-only: permanently deletes every cancelled order at once — used
 * by the "Clear Cancelled" button. An order counts as cancelled the same
 * way the Admin > Cafe tabs do: phase === "cancelled" (older orders
 * without a phase field are never cancelled, so they're untouched).
 */
export async function deleteAllCancelledOrders() {
  const snap = await getDocs(query(collection(db, ORDERS_COLLECTION), where("phase", "==", "cancelled")));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/**
 * Live-subscribes to a single order — used for the customer-facing live
 * tracking view (token, phase, ETA).
 */
export function listenToOrder(orderId, callback) {
  return onSnapshot(doc(db, ORDERS_COLLECTION, orderId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/**
 * Live-subscribes to a user's own orders that haven't reached a final
 * phase yet (not "completed" or "cancelled") — used to fire in-app
 * notifications when the phase changes.
 */
export function listenToActiveUserOrders(uid, callback) {
  return onSnapshot(query(collection(db, ORDERS_COLLECTION), where("uid", "==", uid)), (snap) => {
    const orders = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((o) => o.phase !== "completed" && o.phase !== CANCELLED_PHASE)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    callback(orders);
  });
}

/**
 * Live-subscribes to ALL of a user's cafe orders (every phase, most
 * recent first) — used by the History page so past and in-progress
 * orders both show up with their token, items, and current phase.
 */
export function listenToUserOrders(uid, callback) {
  return onSnapshot(query(collection(db, ORDERS_COLLECTION), where("uid", "==", uid)), (snap) => {
    const orders = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    callback(orders);
  });
}

/**
 * Admin-side update: moves an order to a new phase and/or revises the
 * estimated time. Stamps status_updated_at so the tracker can show
 * "updated 2 min ago" if needed later.
 */
export async function updateOrderStatus(id, { phase, estimatedMinutes } = {}) {
  const updates = { status_updated_at: new Date().toISOString() };
  if (phase) updates.phase = phase;
  if (estimatedMinutes !== undefined && estimatedMinutes !== null && estimatedMinutes !== "") {
    updates.estimatedMinutes = Number(estimatedMinutes);
  }
  await updateDoc(doc(db, ORDERS_COLLECTION, id), updates);
}