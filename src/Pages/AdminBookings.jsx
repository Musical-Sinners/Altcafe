import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, Lock, RefreshCw, ShoppingBag, Trash2, Unlock, XCircle } from "lucide-react";
import {
  BOOKING_TIME_SLOTS,
  BOOKING_TURFS,
  CALENDAR_END_YEAR,
  addTurfPhoto,
  cancelBooking,
  confirmBooking,
  deleteAllCanceledBookings,
  formatBookingDate,
  getDateKey,
  getDefaultSlotMap,
  getMonthCalendar,
  listenToBookingsSnapshot,
  listenToSlotConfig,
  listenToTurfPhotos,
  removeTurfPhoto,
  saveSlotConfig,
  startOfMonth,
} from "../lib/bookingService";
import { uploadMenuItemImage } from "../lib/cafeService"; // generic imgbb upload, reused here for turf photos
import Skeleton from "../components/Skeleton";
import Button from "../components/Button";
import { useToast } from "../contexts/ToastContext";
import "./Admin.css";
import "./AdminCafe.css"; // reuses .admin-cafe-upload-btn for the turf photo uploader

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AdminBookings() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("booking"); // "booking" | "done" | "cancel"
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurf, setSelectedTurf] = useState(BOOKING_TURFS[0].id);
  const [selectedDay, setSelectedDay] = useState(getDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [slotConfig, setSlotConfig] = useState(null);
  const [savingSlot, setSavingSlot] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [clearingCancelled, setClearingCancelled] = useState(false);
  const [turfPhotos, setTurfPhotos] = useState({});
  const [uploadingTurfId, setUploadingTurfId] = useState(null);
  const [removingPhoto, setRemovingPhoto] = useState(null); // `${turfId}::${url}` while a delete is in flight

  const todayStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);
  const currentMonthStart = useMemo(() => startOfMonth(new Date()), []);
  const maxMonthStart = useMemo(() => new Date(CALENDAR_END_YEAR, 11, 1), []);
  const monthCells = useMemo(() => getMonthCalendar(calendarMonth), [calendarMonth]);
  const monthLabel = calendarMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const canGoPrev = calendarMonth.getTime() > currentMonthStart.getTime();
  const canGoNext = calendarMonth.getTime() < maxMonthStart.getTime();

  useEffect(() => {
    const unsubscribe = listenToBookingsSnapshot((data) => {
      setBookings(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = listenToTurfPhotos(setTurfPhotos);
    return unsubscribe;
  }, []);

  const handleTurfPhotoChange = async (turfId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTurfId(turfId);
    try {
      const url = await uploadMenuItemImage(file);
      await addTurfPhoto(turfId, url);
      showToast("Photo added");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not upload photo. Please try again.", "error");
    } finally {
      setUploadingTurfId(null);
      e.target.value = ""; // so re-selecting the same file fires onChange again
    }
  };

  const handleRemoveTurfPhoto = async (turfId, url) => {
    const key = `${turfId}::${url}`;
    setRemovingPhoto(key);
    try {
      await removeTurfPhoto(turfId, url);
    } catch (err) {
      console.error(err);
      showToast("Could not remove photo.", "error");
    } finally {
      setRemovingPhoto(null);
    }
  };

  useEffect(() => {
    const unsubscribe = listenToSlotConfig({ turfId: selectedTurf, day: selectedDay }, setSlotConfig);
    return unsubscribe;
  }, [selectedTurf, selectedDay]);

  const selectedTurfInfo = BOOKING_TURFS.find((t) => t.id === selectedTurf);
  const slotMap = useMemo(() => {
    return { ...getDefaultSlotMap(), ...(slotConfig?.slots || {}) };
  }, [slotConfig]);

  const dayBookings = bookings.filter(
    (booking) => booking.turfId === selectedTurf && booking.day === selectedDay && booking.status !== "canceled"
  );

  // Three buckets, same pattern as Admin > Cafe: Booking (pending/confirmed,
  // still active), Done (confirmed & considered complete), Cancel (canceled).
  const bookingBookings = bookings.filter((b) => (b.status || "pending") === "pending");
  const doneBookings = bookings.filter((b) => (b.status || "pending") === "confirmed");
  const cancelBookings = bookings.filter((b) => (b.status || "pending") === "canceled");

  const visibleBookings = tab === "booking" ? bookingBookings : tab === "done" ? doneBookings : cancelBookings;

  const handleDateSelect = (cell) => {
    if (cell.date < todayStart) return;
    setSelectedDay(cell.key);
    setCalendarMonth(startOfMonth(cell.date));
  };

  const goPrevMonth = () => {
    if (!canGoPrev) return;
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    if (!canGoNext) return;
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const toggleSlot = async (time) => {
    const nextValue = !slotMap[time];
    setSavingSlot(time);
    try {
      await saveSlotConfig({
        turfId: selectedTurf,
        day: selectedDay,
        slots: { ...slotMap, [time]: nextValue },
      });
      showToast(nextValue ? "Slot reopened" : "Slot closed");
    } catch (err) {
      console.error(err);
      showToast("Could not update slot availability.", "error");
    } finally {
      setSavingSlot(null);
    }
  };

  const handleConfirmBooking = async (booking) => {
    setConfirmingId(booking.id);
    try {
      await confirmBooking(booking.id);
      showToast("Booking confirmed");
    } catch (err) {
      console.error(err);
      showToast(`Could not confirm booking${err?.message ? `: ${err.message}` : ""}.`, "error");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelBooking = async (booking) => {
    try {
      await cancelBooking({
        bookingId: booking.id,
        turfId: booking.turfId,
        day: booking.day,
        time: booking.time,
      });
      showToast("Booking canceled and slot reopened");
    } catch (err) {
      console.error(err);
      showToast(`Could not cancel booking${err?.message ? `: ${err.message}` : ""}.`, "error");
    }
  };

  const handleClearCancelled = async () => {
    if (!window.confirm(`Permanently delete all ${cancelBookings.length} cancelled bookings?`)) return;
    setClearingCancelled(true);
    try {
      await deleteAllCanceledBookings();
      showToast("Cancelled bookings cleared");
    } catch (err) {
      console.error(err);
      showToast("Could not clear cancelled bookings.", "error");
    } finally {
      setClearingCancelled(false);
    }
  };

  return (
    <>
      <h1 className="admin-title">Turf ({bookings.length})</h1>

      <div className="admin-cafe-tabs">
        <button
          type="button"
          className={`admin-cafe-tab ${tab === "booking" ? "active" : ""}`}
          onClick={() => setTab("booking")}
        >
          <ShoppingBag size={15} strokeWidth={2.2} /> Booking ({bookingBookings.length})
        </button>
        <button
          type="button"
          className={`admin-cafe-tab ${tab === "done" ? "active" : ""}`}
          onClick={() => setTab("done")}
        >
          <CheckCircle2 size={15} strokeWidth={2.2} /> Done ({doneBookings.length})
        </button>
        <button
          type="button"
          className={`admin-cafe-tab ${tab === "cancel" ? "active" : ""}`}
          onClick={() => setTab("cancel")}
        >
          <XCircle size={15} strokeWidth={2.2} /> Cancel ({cancelBookings.length})
        </button>
      </div>

      <div className="admin-users-card surface-card" style={{ marginBottom: 20 }}>
        <h2>Turf Photos</h2>
        <p style={{ color: "var(--color-subtext)", fontSize: 13.5, marginBottom: 14 }}>
          Shown to customers on the booking page. Add multiple photos per turf — they auto-rotate every 3
          seconds. Hover a photo to remove it.
        </p>
        <div className="admin-turf-photo-grid">
          {BOOKING_TURFS.map((turf) => {
            const photos = turfPhotos[turf.id] || [];
            return (
              <div key={turf.id} className="admin-turf-photo-card">
                <strong>{turf.name}</strong>
                <div className="admin-turf-photo-gallery">
                  {photos.map((url) => (
                    <div key={url} className="admin-turf-photo-thumb">
                      <img src={url} alt={turf.name} />
                      <button
                        type="button"
                        className="admin-turf-photo-remove"
                        title="Remove photo"
                        disabled={removingPhoto === `${turf.id}::${url}`}
                        onClick={() => handleRemoveTurfPhoto(turf.id, url)}
                      >
                        <Trash2 size={12} strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                  {photos.length === 0 && <div className="admin-turf-photo-empty">No photos yet</div>}
                </div>
                <label className="admin-cafe-upload-btn">
                  <ImagePlus size={14} strokeWidth={2.1} />
                  {uploadingTurfId === turf.id ? "Uploading..." : "Add Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploadingTurfId === turf.id}
                    onChange={(e) => handleTurfPhotoChange(turf.id, e)}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-users-card surface-card admin-booking-panel">
        <div className="admin-booking-panel-head">
          <div>
            <h2>Live Slot Control</h2>
            <p>
              Manage which slots are open for {selectedTurfInfo.name} on {formatBookingDate(selectedDay)}.
            </p>
          </div>
          <span className="admin-live-pill">
            <RefreshCw size={14} strokeWidth={2.2} /> Live
          </span>
        </div>

        <div className="admin-booking-filters">
          <div className="admin-filter-group">
            <label>Turf</label>
            <div className="admin-filter-pills">
              {BOOKING_TURFS.map((turf) => (
                <button
                  key={turf.id}
                  type="button"
                  className={`admin-filter-pill ${selectedTurf === turf.id ? "active" : ""}`}
                  onClick={() => setSelectedTurf(turf.id)}
                >
                  {turf.name}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-filter-group">
            <label>Date</label>
            <div className="calendar-card admin-calendar-card">
              <div className="calendar-head">
                <button type="button" className="calendar-nav-btn" onClick={goPrevMonth} disabled={!canGoPrev}>
                  <ChevronLeft size={18} strokeWidth={2.2} />
                </button>
                <div className="calendar-month-label">{monthLabel}</div>
                <button type="button" className="calendar-nav-btn" onClick={goNextMonth} disabled={!canGoNext}>
                  <ChevronRight size={18} strokeWidth={2.2} />
                </button>
              </div>

              <div className="calendar-weekdays">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="calendar-grid">
                {monthCells.map((cell) => {
                  const isToday = cell.key === getDateKey(todayStart);
                  const isSelected = selectedDay === cell.key;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={`calendar-day ${cell.inMonth ? "in-month" : "outside"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                      onClick={() => handleDateSelect(cell)}
                      disabled={cell.date < todayStart}
                    >
                      <span>{cell.date.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-slot-grid">
          {BOOKING_TIME_SLOTS.map((time) => {
            const isOpen = slotMap[time] !== false;
            const isBooked = dayBookings.some((booking) => booking.time === time);
            const effectiveOpen = isOpen && !isBooked;

            return (
              <button
                key={time}
                type="button"
                className={`admin-slot-chip ${effectiveOpen ? "available" : "booked"}`}
                onClick={() => toggleSlot(time)}
                disabled={savingSlot === time}
              >
                <span>{time}</span>
                {effectiveOpen ? <Unlock size={15} strokeWidth={2.2} /> : <Lock size={15} strokeWidth={2.2} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="admin-users-card surface-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2>
            {tab === "booking" ? "Active Bookings" : tab === "done" ? "Done Bookings" : "Cancelled Bookings"} (
            {visibleBookings.length})
          </h2>
          {tab === "cancel" && cancelBookings.length > 0 && (
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              loading={clearingCancelled}
              onClick={handleClearCancelled}
            >
              Clear Cancelled
            </Button>
          )}
        </div>
        {loading ? (
          <Skeleton height={200} />
        ) : visibleBookings.length === 0 ? (
          <div className="admin-empty-state">
            <CalendarDays size={26} strokeWidth={1.8} />
            <p>{tab === "booking" ? "No active bookings" : tab === "done" ? "Nothing here yet" : "Nothing here yet"}</p>
            <span>
              {tab === "booking"
                ? "New turf bookings from the Booking page will show up here."
                : tab === "done"
                ? "Bookings you confirm will show up here."
                : "Bookings you cancel will show up here."}
            </span>
          </div>
        ) : (
          <div className="admin-table-scroll">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Turf</th>
                <th>Location</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Txn ID</th>
                <th>Price</th>
                <th>Booked</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleBookings.map((b) => {
                const status = b.status || "pending";
                return (
                <tr key={b.id}>
                  <td>{b.userName || b.userContact || "—"}</td>
                  <td>{b.turf} <span style={{ color: "var(--color-subtext)", fontSize: 11.5 }}>({b.turfId || "—"})</span></td>
                  <td>{b.location}</td>
                  <td>{formatBookingDate(b.day)}</td>
                  <td>{b.time}</td>
                  <td>
                    <span className={`admin-booking-status ${status}`}>
                      {status}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-payment-pill ${b.paymentMethod === "qr" ? "qr" : "cash"}`}>
                      {b.paymentMethod === "qr" ? "QR" : "Cash"}
                    </span>
                  </td>
                  <td className="admin-cell-wrap" title={b.paymentMethod === "qr" ? b.transactionId || "" : ""}>
                    {b.paymentMethod === "qr" ? (b.transactionId || "—") : "—"}
                  </td>
                  <td>₹{b.price}</td>
                  <td>{formatDate(b.created_at)}</td>
                  <td className="admin-cell-actions">
                    {status === "canceled" ? (
                      <span style={{ color: "var(--color-subtext)", fontSize: 13 }}>Canceled</span>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        {status === "pending" && (
                          <Button
                            size="sm"
                            loading={confirmingId === b.id}
                            onClick={() => handleConfirmBooking(b)}
                          >
                            Confirm
                          </Button>
                        )}
                        <Button size="sm" variant="danger" onClick={() => handleCancelBooking(b)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}

export default AdminBookings;
