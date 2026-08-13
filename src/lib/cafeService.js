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
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

const MENU_COLLECTION = "cafe_menu";
const ORDERS_COLLECTION = "cafe_orders";
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
 * Saves a placed cafe order so the Admin panel can see it. The wallet
 * debit itself is still handled separately via addWalletTransaction —
 * this is just the order record (what was ordered, by whom).
 */
export async function createOrder(uid, { items, total, userName, userContact, paymentMethod }) {
  const orderRef = await addDoc(collection(db, ORDERS_COLLECTION), {
    uid,
    items, // [{ name, qty, price }]
    total,
    userName: userName || "",
    userContact: userContact || "",
    paymentMethod: paymentMethod || "cash",
    status: "placed", // "placed" (waiting) -> "done" (delivered)
    created_at: new Date().toISOString(),
  });
  return orderRef.id;
}

/**
 * Live-subscribes to every cafe order, most recent first — used by the
 * Admin panel's Cafe > Orders tab.
 */
export function listenToOrders(callback) {
  return onSnapshot(query(collection(db, ORDERS_COLLECTION), orderBy("created_at", "desc")), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function updateOrderStatus(id, status) {
  await updateDoc(doc(db, ORDERS_COLLECTION, id), { status });
}
