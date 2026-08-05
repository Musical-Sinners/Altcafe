// Firestore logic for turf bookings. Kept separate from userService.js
// since bookings are their own concern (used by the Booking page and by
// the Admin > Bookings page).

import { collection, doc, getDocs, onSnapshot, orderBy, query, runTransaction, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { recordAdminActivity } from "./adminActivity";

export const BOOKING_TURFS = [
  { id: "a", name: "Turf A", location: "Savar" },
  { id: "b", name: "Turf B", location: "Savar" },
  { id: "c", name: "Turf C", location: "Dhanmondi" },
];

export const BOOKING_TIME_SLOTS = ["4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"];
export const BOOKING_PRICE = 600;
export const CALENDAR_START_YEAR = new Date().getFullYear();
export const CALENDAR_END_YEAR = 2050;

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

export function listenToBookingsSnapshot(callback) {
  return onSnapshot(query(collection(db, "bookings"), orderBy("created_at", "desc")), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
 * Saves a confirmed booking. We store the user's name/contact directly on
 * the booking doc (denormalized) so the Admin panel can list bookings
 * without doing a separate lookup per row for every user.
 */
export async function createBooking(uid, { turfId, turf, location, day, time, price, userName, userContact }) {
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
      userName: userName || "",
      userContact: userContact || "",
      status: "confirmed",
      created_at: new Date().toISOString(),
    });

    logPayload = {
      action: "booking-created",
      title: "New booking",
      detail: `${userName || userContact || uid} booked ${turf} on ${formatBookingDate(day)} at ${time}`,
      targetType: "booking",
      targetId: bookingId,
      meta: { uid, turfId, turf, location, day, time, price, userName, userContact },
    };

    return bookingId;
  });

  if (logPayload) {
    await recordAdminActivity(logPayload);
  }

  return result;
}

export async function cancelBooking({ bookingId, turfId, day, time, canceledBy = "admin" }) {
  const bookingRef = doc(db, "bookings", bookingId);
  let resolvedTurfId = turfId || "unknown";
  let resolvedDay = day || "unknown";
  let resolvedTime = time || "unknown";
  let resolvedUser = "unknown";
  let logPayload = null;

  return runTransaction(db, async (transaction) => {
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
    await recordAdminActivity({
      ...logPayload,
    });
  }
}

/**
 * Fetches every booking, most recent first — used by the Admin panel.
 */
export async function getAllBookings() {
  const snap = await getDocs(query(collection(db, "bookings"), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
