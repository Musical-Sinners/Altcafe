import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Lock, RefreshCw, Unlock } from "lucide-react";
import {
  BOOKING_PRICE,
  BOOKING_TIME_SLOTS,
  BOOKING_TURFS,
  CALENDAR_END_YEAR,
  cancelBooking,
  formatBookingDate,
  getDateKey,
  getDefaultSlotMap,
  getMonthCalendar,
  listenToBookingsSnapshot,
  listenToSlotConfig,
  saveSlotConfig,
  startOfMonth,
} from "../lib/bookingService";
import Skeleton from "../components/Skeleton";
import Button from "../components/Button";
import { useToast } from "../contexts/ToastContext";
import "./Admin.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AdminBookings() {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurf, setSelectedTurf] = useState(BOOKING_TURFS[0].id);
  const [selectedDay, setSelectedDay] = useState(getDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [slotConfig, setSlotConfig] = useState(null);
  const [savingSlot, setSavingSlot] = useState(null);

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
  const activeBookings = bookings.filter((booking) => booking.status !== "canceled");

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

  return (
    <>
      <h1 className="admin-title">Bookings ({bookings.length})</h1>

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
        {loading ? (
          <Skeleton height={200} />
        ) : activeBookings.length === 0 ? (
          <div className="admin-empty-state">
            <CalendarDays size={26} strokeWidth={1.8} />
            <p>No bookings yet</p>
            <span>Confirmed turf bookings from the Booking page will show up here.</span>
          </div>
        ) : (
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Turf ID</th>
                <th>Turf</th>
                <th>Location</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Price</th>
                <th>Booked On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeBookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.userName || b.userContact || "—"}</td>
                  <td>{b.turfId || "—"}</td>
                  <td>{b.turf}</td>
                  <td>{b.location}</td>
                  <td>{formatBookingDate(b.day)}</td>
                  <td>{b.time}</td>
                  <td>
                    <span className={`admin-booking-status ${b.status === "canceled" ? "canceled" : "confirmed"}`}>
                      {b.status || "confirmed"}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-payment-pill ${b.paymentMethod === "qr" ? "qr" : "cash"}`}>
                      {b.paymentMethod === "qr" ? "QR" : "Cash"}
                    </span>
                  </td>
                  <td>₹{b.price}</td>
                  <td>{formatDate(b.created_at)}</td>
                  <td>
                    {b.status === "canceled" ? (
                      <span style={{ color: "var(--color-subtext)", fontSize: 13 }}>Canceled</span>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => handleCancelBooking(b)}>
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default AdminBookings;
