import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, Clock, MapPin } from "lucide-react";
import { auth } from "../firebase";
import { getUserProfile } from "../lib/userService";
import {
  BOOKING_PRICE,
  BOOKING_TIME_SLOTS,
  BOOKING_TURFS,
  CALENDAR_END_YEAR,
  createBooking,
  formatBookingDate,
  getDateKey,
  getMonthCalendar,
  listenToBookingsForSlotState,
  listenToSlotConfig,
  startOfMonth,
} from "../lib/bookingService";
import { useToast } from "../contexts/ToastContext";
import Button from "../components/Button";
import BookingSuccess from "../components/BookingSuccess";
import "./Booking.css";

function Booking() {
  const { showToast } = useToast();
  const [selectedTurf, setSelectedTurf] = useState("a");
  const [selectedDay, setSelectedDay] = useState(getDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [selectedSlot, setSelectedSlot] = useState("6:00 PM");
  const [success, setSuccess] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotConfig, setSlotConfig] = useState(null);

  const activeTurf = BOOKING_TURFS.find((t) => t.id === selectedTurf);
  const activeDay = selectedDay;
  const monthCells = useMemo(() => getMonthCalendar(calendarMonth), [calendarMonth]);
  const monthLabel = calendarMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const todayStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);
  const currentMonthStart = useMemo(() => startOfMonth(new Date()), []);
  const maxMonthStart = useMemo(() => new Date(CALENDAR_END_YEAR, 11, 1), []);
  const canGoPrev = calendarMonth.getTime() > currentMonthStart.getTime();
  const canGoNext = calendarMonth.getTime() < maxMonthStart.getTime();

  useEffect(() => {
    const unsubscribeBookings = listenToBookingsForSlotState(
      { turfId: selectedTurf, day: activeDay },
      setBookedSlots
    );
    const unsubscribeConfig = listenToSlotConfig({ turfId: selectedTurf, day: activeDay }, setSlotConfig);

    return () => {
      unsubscribeBookings();
      unsubscribeConfig();
    };
  }, [selectedTurf, activeDay]);

  const slotStatusMap = useMemo(() => {
    const map = {};
    BOOKING_TIME_SLOTS.forEach((slot) => {
      map[slot] = slotConfig?.slots?.[slot] !== false;
    });
    bookedSlots.forEach((booking) => {
      map[booking.time] = false;
    });
    return map;
  }, [bookedSlots, slotConfig]);

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

  const handleConfirm = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast("Please log in again to book.", "error");
      return;
    }
    if (!slotStatusMap[selectedSlot]) {
      showToast("That slot is already booked or closed.", "error");
      return;
    }
    setConfirming(true);
    try {
      const profile = await getUserProfile(currentUser.uid);
      await createBooking(currentUser.uid, {
        turfId: activeTurf.id,
        turf: activeTurf.name,
        location: activeTurf.location,
        day: activeDay,
        time: selectedSlot,
        price: BOOKING_PRICE,
        userName: profile?.name || "",
        userContact: profile?.phone || profile?.email || "",
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      if (err.message === "slot-already-booked" || err.message === "slot-closed") {
        showToast("That slot is already booked or closed.", "error");
      } else {
        showToast("Could not confirm booking. Please try again.", "error");
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="booking-page">
      <div className="booking-inner">
        <h1 className="booking-title">Available Turfs</h1>

        <div className="turf-list">
          {BOOKING_TURFS.map((turf) => (
            <button
              key={turf.id}
              className={`turf-card ${selectedTurf === turf.id ? "selected" : ""}`}
              onClick={() => setSelectedTurf(turf.id)}
              type="button"
            >
              <div className="turf-card-icon">⚽</div>
              <div className="turf-card-body">
                <div className="turf-card-name">{turf.name}</div>
                <div className="turf-card-meta">
                  <MapPin size={13} strokeWidth={2.2} /> {turf.location}
                </div>
              </div>
              <div className="turf-card-status available">Live availability</div>
            </button>
          ))}
        </div>

        <section className="booking-section">
          <h2>Calendar</h2>
          <div className="calendar-card">
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
                const disabled = cell.date < todayStart;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={`calendar-day ${cell.inMonth ? "in-month" : "outside"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                    onClick={() => handleDateSelect(cell)}
                    disabled={disabled}
                  >
                    <span>{cell.date.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="calendar-selected-note">Selected: {formatBookingDate(selectedDay)}</p>
        </section>

        <section className="booking-section">
          <h2>Time Slots</h2>
          <div className="slot-grid">
            {BOOKING_TIME_SLOTS.map((slot) => {
              const isAvailable = slotStatusMap[slot];
              return (
                <button
                  key={slot}
                  className={`slot-chip ${selectedSlot === slot ? "selected" : ""} ${isAvailable ? "available" : "booked"}`}
                  onClick={() => isAvailable && setSelectedSlot(slot)}
                  disabled={!isAvailable}
                  type="button"
                >
                  <Clock size={13} strokeWidth={2.2} /> {slot}
                </button>
              );
            })}
          </div>
        </section>

        <Button className="booking-confirm-btn" icon={CheckCircle} onClick={handleConfirm} loading={confirming}>
          Confirm Booking · ₹{BOOKING_PRICE}
        </Button>
      </div>

      <BookingSuccess
        open={success}
        onClose={() => setSuccess(false)}
        turf={activeTurf.name}
        day={formatBookingDate(selectedDay)}
        time={selectedSlot}
      />
    </div>
  );
}

export default Booking;