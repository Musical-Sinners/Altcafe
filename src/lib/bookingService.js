// Firestore logic for turf bookings. Kept separate from userService.js
// since bookings are their own concern (used by the Booking page and by
// the Admin > Bookings page).

import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Saves a confirmed booking. We store the user's name/contact directly on
 * the booking doc (denormalized) so the Admin panel can list bookings
 * without doing a separate lookup per row for every user.
 */
export async function createBooking(uid, { turf, location, day, time, price, userName, userContact }) {
  const bookingRef = await addDoc(collection(db, "bookings"), {
    uid,
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
  return bookingRef.id;
}

/**
 * Fetches every booking, most recent first — used by the Admin panel.
 */
export async function getAllBookings() {
  const snap = await getDocs(query(collection(db, "bookings"), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
