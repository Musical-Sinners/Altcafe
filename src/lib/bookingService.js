// Firestore logic for turf bookings. Kept separate from userService.js
// since bookings are their own concern (used by the Booking page and by
// the Admin > Bookings page).

import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { recordAdminActivity } from "./adminActivity";

export const BOOKING_TURFS = [
  { id: "a", name: "Turf A", location: "Kolkata" },
  { id: "b", name: "Turf B", location: "Kolkata" },
  { id: "c", name: "Turf C", location: "Kolkata" },
];

export const BOOKING_TIME_SLOTS = ["4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"];
// Fallback only — shown until the live price loads from Firestore, and used
// if the settings doc is ever missing. The real, admin-editable price lives
// in Firestore (see getBookingPrice/listenToBookingPrice/updateBookingPrice
// below) so a change applies to every user instantly, with no redeploy.
export const BOOKING_PRICE = 600;
export const CALENDAR_START_YEAR = new Date().getFullYear();
export const CALENDAR_END_YEAR = 2050;

// --- Turf rent price (admin-editable) ---------------------------------
// Single Firestore doc, same pattern as settings/payment for the QR code.
export const BOOKING_PRICE_DOC = doc(db, "settings", "booking");

export function listenToBookingPrice(callback) {
  return onSnapshot(BOOKING_PRICE_DOC, (snap) => {
    const price = snap.exists() ? Number(snap.data().price) : NaN;
    callback(Number.isFinite(price) && price > 0 ? price : BOOKING_PRICE);
  });
}

export async function getBookingPrice() {
  const snap = await getDoc(BOOKING_PRICE_DOC);
  const price = snap.exists() ? Number(snap.data().price) : NaN;
  return Number.isFinite(price) && price > 0 ? price : BOOKING_PRICE;
}

export async function updateBookingPrice(price) {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    throw new Error("invalid-price");
  }
  await setDoc(
    BOOKING_PRICE_DOC,
    { price: numericPrice, updated_at: new Date().toISOString() },
    { merge: true }
  );

  await recordAdminActivity({
    action: "booking-price-updated",
    title: "Turf price updated",
    detail: `Turf rent price was changed to ₹${numericPrice}`,
    targetType: "settings",
    targetId: "booking",
    meta: { price: numericPrice },
  });
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

export function getDateKey(date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function formatBookingDate(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey || "—";
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isSameMonth(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();
}

export function isSameDateKey(dateKeyA, dateKeyB) {
  return String(dateKeyA || "") === String(dateKeyB || "");
}

export function getMonthCalendar(date) {
  const firstDayOfMonth = startOfMonth(date);
  const startDay = new Date(firstDayOfMonth);
  startDay.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const current = new Date(startDay);
    current.setDate(startDay.getDate() + i);
    cells.push({
      key: getDateKey(current),
      date: current,
      inMonth: current.getMonth() === date.getMonth(),
    });
  }

  return cells;
}

export function getBookingDocId({ turfId, day, time }) {
  return `${normalizeKey(turfId)}__${normalizeKey(day)}__${normalizeKey(time)}`;
}

export function getBookingSlotConfigId({ turfId, day }) {
  return `${normalizeKey(turfId)}__${normalizeKey(day)}`;
}

export function getDefaultSlotMap() {
  return BOOKING_TIME_SLOTS.reduce((acc, slot) => {
    acc[slot] = true;
    return acc;
  }, {});
}

export function listenToBookingsSnapshot(callback, onError) {
  return onSnapshot(
    query(collection(db, "bookings"), orderBy("created_at", "desc")),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    onError
  );
}
/**
 * Live-subscribes to a single user's own turf bookings (all statuses,
 * most recent first) — used by the History page's "Turf" tab.
 */
export function listenToUserBookings(uid, callback) {
  return onSnapshot(query(collection(db, "bookings"), where("uid", "==", uid)), (snap) => {
    const bookings = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    callback(bookings);
  });
}

export function listenToBookingsForSlotState({ turfId, day }, callback) {
  return onSnapshot(
    query(collection(db, "bookings"), orderBy("created_at", "desc")),
    (snap) => {
      const filtered = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((booking) => booking.turfId === turfId && booking.day === day && booking.status !== "canceled");
      callback(filtered);
    }
  );
}

export function listenToSlotConfig({ turfId, day }, callback) {
  return onSnapshot(doc(db, "booking_slots", getBookingSlotConfigId({ turfId, day })), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function saveSlotConfig({ turfId, day, slots }) {
  const changedSlots = Object.entries(slots)
    .filter(([, value]) => value === false)
    .map(([time]) => time);

  await setDoc(
    doc(db, "booking_slots", getBookingSlotConfigId({ turfId, day })),
    {
      turfId,
      day,
      slots,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );

  await recordAdminActivity({
    action: "slot-updated",
    title: "Slot updated",
    detail:
      changedSlots.length > 0
        ? `${turfId} on ${day} closed: ${changedSlots.join(", ")}`
        : `${turfId} on ${day} reopened slots`,
    targetType: "slot-config",
    targetId: getBookingSlotConfigId({ turfId, day }),
    meta: { turfId, day, slots },
  });
}

/**
 * Saves a booking. A booking is never written as "confirmed" straight
 * away — both payment methods land as "pending" (shown yellow in the UI)
 * and only an admin can move it to "confirmed":
 *   - cash: the slot is held immediately, but the admin still has to
 *     confirm it once the customer actually pays at the counter.
 *   - qr: the customer already typed in a transaction ID (required —
 *     see PaymentMethodModal), and the admin confirms after checking it
 *     against the actual payment received.
 * We store the user's name/contact directly on the booking doc
 * (denormalized) so the Admin panel can list bookings without doing a
 * separate lookup per row for every user.
 */
export async function createBooking(uid, { turfId, turf, location, day, time, price, walletCreditApplied, userName, userContact, paymentMethod, transactionId }) {
  const bookingId = getBookingDocId({ turfId, day, time });
  const bookingRef = doc(db, "bookings", bookingId);
  const slotConfigRef = doc(db, "booking_slots", getBookingSlotConfigId({ turfId, day }));
  let logPayload = null;

  const result = await runTransaction(db, async (transaction) => {
    const existingBooking = await transaction.get(bookingRef);
    if (existingBooking.exists() && existingBooking.data().status !== "canceled") {
      throw new Error("slot-already-booked");
    }

    const slotConfigSnap = await transaction.get(slotConfigRef);
    const slotConfig = slotConfigSnap.exists() ? slotConfigSnap.data() : null;
    const isSlotOpen = slotConfig?.slots?.[time] !== false;
    if (!isSlotOpen) {
      throw new Error("slot-closed");
    }

    transaction.set(bookingRef, {
      uid,
      turfId,
      turf,
      location,
      day,
      time,
      price,
      walletCreditApplied: walletCreditApplied || 0,
      userName: userName || "",
      userContact: userContact || "",
      status: "pending",
      paymentMethod: paymentMethod || "cash",
      transactionId: paymentMethod === "qr" ? transactionId || "" : "",
      created_at: new Date().toISOString(),
    });

    logPayload = {
      action: "booking-created",
      title: "New booking",
      detail: `${userName || userContact || uid} booked ${turf} on ${formatBookingDate(day)} at ${time} (${paymentMethod || "cash"}) — pending confirmation`,
      targetType: "booking",
      targetId: bookingId,
      meta: { uid, turfId, turf, location, day, time, price, userName, userContact, paymentMethod: paymentMethod || "cash", transactionId: transactionId || "" },
    };

    return bookingId;
  });

  if (logPayload) {
    await recordAdminActivity(logPayload);
  }

  return result;
}

/**
 * Admin-only action: moves a pending booking to "confirmed". There is no
 * equivalent user-facing function — customers can never confirm their own
 * booking, cash or QR.
 */
export async function confirmBooking(bookingId) {
  const bookingRef = doc(db, "bookings", bookingId);
  let logPayload = null;

  await runTransaction(db, async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists()) {
      throw new Error("booking-not-found");
    }
    const booking = bookingSnap.data();
    if (booking.status === "canceled") {
      throw new Error("booking-canceled");
    }

    transaction.update(bookingRef, {
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    });

    logPayload = {
      action: "booking-confirmed",
      title: "Booking confirmed",
      detail: `${booking.userName || booking.userContact || booking.uid} · ${booking.turf} on ${formatBookingDate(booking.day)} at ${booking.time} (${booking.paymentMethod || "cash"})`,
      targetType: "booking",
      targetId: bookingId,
      meta: { paymentMethod: booking.paymentMethod || "cash", transactionId: booking.transactionId || "" },
    };
  });

  if (logPayload) {
    await recordAdminActivity(logPayload);
  }
}

export async function cancelBooking({ bookingId, turfId, day, time, canceledBy = "admin" }) {
  const bookingRef = doc(db, "bookings", bookingId);
  let resolvedTurfId = turfId || "unknown";
  let resolvedDay = day || "unknown";
  let resolvedTime = time || "unknown";
  let resolvedUser = "unknown";
  let logPayload = null;

  const result = await runTransaction(db, async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists()) {
      throw new Error("booking-not-found");
    }

    const booking = bookingSnap.data();
    resolvedTurfId = turfId || booking.turfId || "unknown";
    resolvedDay = day || booking.day || "unknown";
    resolvedTime = time || booking.time || "unknown";
    resolvedUser = booking.userName || booking.userContact || booking.uid || "unknown";

    const slotConfigRefInner = doc(db, "booking_slots", getBookingSlotConfigId({ turfId: resolvedTurfId, day: resolvedDay }));
    const slotConfigSnap = await transaction.get(slotConfigRefInner);
    const slotConfig = slotConfigSnap.exists() ? slotConfigSnap.data() : null;

    if (booking.status === "canceled") {
      return bookingId;
    }

    transaction.update(bookingRef, {
      status: "canceled",
      canceled_at: new Date().toISOString(),
      canceled_by: canceledBy,
    });

    const slots = { ...(slotConfig?.slots || getDefaultSlotMap()), [resolvedTime]: true };
    transaction.set(
      slotConfigRefInner,
      {
        turfId: resolvedTurfId,
        day: resolvedDay,
        slots,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    logPayload = {
      action: "booking-canceled",
      title: "Booking canceled",
      detail: `${resolvedUser} canceled ${resolvedTurfId} on ${resolvedDay} at ${resolvedTime}`,
      targetType: "booking",
      targetId: bookingId,
      meta: { turfId: resolvedTurfId, day: resolvedDay, time: resolvedTime, canceledBy },
    };

    return bookingId;
  });

  if (logPayload) {
    await recordAdminActivity(logPayload);
  }

  return result;
}

/**
 * Fetches every booking, most recent first — used by the Admin panel.
 */
export async function getAllBookings() {
  const snap = await getDocs(query(collection(db, "bookings"), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Admin-only: permanently deletes a single booking doc (used for
 * clearing out canceled bookings once they're no longer needed).
 */
export async function deleteBooking(bookingId) {
  await deleteDoc(doc(db, "bookings", bookingId));
}

/**
 * Admin-only: permanently deletes every canceled booking at once — used
 * by the "Clear Cancelled" button so old canceled entries don't pile up
 * before going live.
 */
export async function deleteAllCanceledBookings() {
  const snap = await getDocs(query(collection(db, "bookings"), where("status", "==", "canceled")));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// --- Turf photos --------------------------------------------------------
// BOOKING_TURFS (name/location) stays hardcoded above, but each turf's
// photos are admin-editable, so they're stored separately in Firestore
// keyed by turf id — a turf can have multiple photos, which the Booking
// page auto-rotates every few seconds.

const TURF_META_COLLECTION = "turf_meta";

/**
 * Live-subscribes to every turf's saved photos. Returns a plain object
 * { [turfId]: string[] } so callers can just do turfPhotos[turf.id].
 * Reads the old single-`photo` field too, for docs saved before this
 * became a list, so nothing already uploaded gets lost.
 */
export function listenToTurfPhotos(callback) {
  return onSnapshot(collection(db, TURF_META_COLLECTION), (snap) => {
    const photos = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      if (Array.isArray(data.photos) && data.photos.length) {
        photos[d.id] = data.photos;
      } else if (data.photo) {
        photos[d.id] = [data.photo];
      } else {
        photos[d.id] = [];
      }
    });
    callback(photos);
  });
}

/**
 * Admin-only: adds one more photo to a turf's gallery (already uploaded
 * via uploadMenuItemImage, which is generic despite the name).
 */
export async function addTurfPhoto(turfId, photoUrl) {
  await setDoc(
    doc(db, TURF_META_COLLECTION, turfId),
    {
      photos: arrayUnion(photoUrl),
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Admin-only: removes a single photo from a turf's gallery.
 */
export async function removeTurfPhoto(turfId, photoUrl) {
  await setDoc(
    doc(db, TURF_META_COLLECTION, turfId),
    {
      photos: arrayRemove(photoUrl),
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
}
