import { useEffect, useMemo, useState } from "react";
import { MapPin, Clock, CheckCircle, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "../firebase";
import { getUserProfile, updateUserProfile, addWalletTransaction } from "../lib/userService";
import {
  BOOKING_TURFS,
  BOOKING_TIME_SLOTS,
  BOOKING_PRICE,
  CALENDAR_END_YEAR,
  createBooking,
  formatBookingDate,
  getDateKey,
  getDefaultSlotMap,
  getMonthCalendar,
  listenToBookingsForSlotState,
  listenToSlotConfig,
  startOfMonth,
} from "../lib/bookingService";
import { COUNTRY_CODES, getCountryConfig } from "../lib/countryCodes";
import { useToast } from "../contexts/ToastContext";
import Button from "../components/Button";
import Modal from "../components/Modal";
import BookingSuccess from "../components/BookingSuccess";
import PaymentMethodModal from "../components/PaymentMethodModal";
import "./Booking.css";
import "./Login.css"; // reuses the phone-row / country-select input styles

function Booking() {
  const { showToast } = useToast();
  const [selectedTurf, setSelectedTurf] = useState(BOOKING_TURFS[0].id);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [success, setSuccess] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Full month calendar — same date-picking pattern used in the Admin panel,
  // so users can book any day (not just a fixed 5-day strip).
  const [selectedDay, setSelectedDay] = useState(getDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));

  // Which slots are open (admin can close a slot) and which are already
  // booked by someone — both update live via Firestore listeners so two
  // people can't double-book the same slot.
  const [slotConfig, setSlotConfig] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Phone-number gate: a turf booking always needs a contact number on file
  // so the cafe can reach the user about it.
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const phoneCountryConfig = getCountryConfig(phoneCountryCode);

  // Payment step — shown after the phone-number gate, before the booking
  // is actually written to Firestore.
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingProfile, setPendingProfile] = useState(null);
  const [payingBooking, setPayingBooking] = useState(false);

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

  const activeTurf = BOOKING_TURFS.find((t) => t.id === selectedTurf);

  // Reset the chosen slot whenever turf or day changes, since availability
  // is specific to that turf+day combination.
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedTurf, selectedDay]);

  useEffect(() => {
    setLoadingSlots(true);
    const unsubscribeSlots = listenToSlotConfig({ turfId: selectedTurf, day: selectedDay }, (config) => {
      setSlotConfig(config);
      setLoadingSlots(false);
    });
    const unsubscribeBookings = listenToBookingsForSlotState(
      { turfId: selectedTurf, day: selectedDay },
      setDayBookings
    );
    return () => {
      unsubscribeSlots();
      unsubscribeBookings();
    };
  }, [selectedTurf, selectedDay]);

  const slotMap = useMemo(() => {
    return { ...getDefaultSlotMap(), ...(slotConfig?.slots || {}) };
  }, [slotConfig]);

  const isSlotAvailable = (time) => {
    const isOpen = slotMap[time] !== false;
    const isBooked = dayBookings.some((booking) => booking.time === time);
    return isOpen && !isBooked;
  };

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

  const bookWithProfile = async (profile, paymentMethod) => {
    const currentUser = auth.currentUser;
    await createBooking(currentUser.uid, {
      turfId: activeTurf.id,
      turf: activeTurf.name,
      location: activeTurf.location,
      day: selectedDay,
      time: selectedSlot,
      price: BOOKING_PRICE,
      userName: profile?.name || "",
      userContact: profile?.phone || profile?.email || "",
      paymentMethod,
    });

    // Record this booking as a wallet transaction so it shows up on the
    // Wallet and History pages. Negative amount = money spent.
    await addWalletTransaction(currentUser.uid, {
      label: `${activeTurf.name} · ${formatBookingDate(selectedDay)} ${selectedSlot}`,
      amount: -BOOKING_PRICE,
    });

    setSuccess(true);
  };

  // Step 1: validate + fetch profile, then either gate on phone number or
  // go straight to the payment-method step (booking isn't written yet).
  const handleConfirm = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast("Please log in again to book.", "error");
      return;
    }
    if (!selectedSlot) {
      showToast("Please choose a time slot.", "error");
      return;
    }
    setConfirming(true);
    try {
      const profile = await getUserProfile(currentUser.uid);
      if (!profile?.phone) {
        setPendingProfile(profile);
        setPhoneModalOpen(true);
        return;
      }
      setPendingProfile(profile);
      setPaymentModalOpen(true);
    } catch (err) {
      console.error(err);
      showToast("Could not start booking. Please try again.", "error");
    } finally {
      setConfirming(false);
    }
  };

  const handleSavePhoneAndContinue = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const digitsOnly = phoneNumber.replace(/[^0-9]/g, "");
    if (digitsOnly.length !== phoneCountryConfig.digits) {
      showToast(`Enter a valid ${phoneCountryConfig.digits}-digit number.`, "error");
      return;
    }

    setSavingPhone(true);
    try {
      const fullPhone = `${phoneCountryCode}${digitsOnly}`;
      await updateUserProfile(currentUser.uid, { phone: fullPhone });
      const profile = await getUserProfile(currentUser.uid);
      setPhoneModalOpen(false);
      setPhoneNumber("");
      setPendingProfile(profile);
      setPaymentModalOpen(true);
    } catch (err) {
      console.error(err);
      showToast("Could not save your phone number. Please try again.", "error");
    } finally {
      setSavingPhone(false);
    }
  };

  // Step 2: called once the user picks QR or Cash and taps confirm — this
  // is the point where the booking actually gets written to Firestore.
  const handlePaymentConfirm = async (method) => {
    setPayingBooking(true);
    try {
      await bookWithProfile(pendingProfile, method);
      setPaymentModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err.message === "slot-already-booked" || err.message === "slot-closed") {
        showToast("That slot was just taken. Please pick another.", "error");
        setPaymentModalOpen(false);
      } else {
        showToast("Could not confirm booking. Please try again.", "error");
      }
    } finally {
      setPayingBooking(false);
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
            >
              <div className="turf-card-icon">⚽</div>
              <div className="turf-card-body">
                <div className="turf-card-name">{turf.name}</div>
                <div className="turf-card-meta">
                  <MapPin size={13} strokeWidth={2.2} /> {turf.location}
                </div>
              </div>
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
          <p className="calendar-selected-note">{formatBookingDate(selectedDay)}</p>
        </section>

        <section className="booking-section">
          <h2>Time Slots</h2>
          {loadingSlots ? (
            <p style={{ color: "var(--color-subtext)", fontSize: 13 }}>Checking availability…</p>
          ) : (
            <div className="slot-grid">
              {BOOKING_TIME_SLOTS.map((slot) => {
                const available = isSlotAvailable(slot);
                return (
                  <button
                    key={slot}
                    className={`slot-chip ${selectedSlot === slot ? "selected" : ""} ${!available ? "disabled" : ""}`}
                    onClick={() => available && setSelectedSlot(slot)}
                    disabled={!available}
                  >
                    <Clock size={13} strokeWidth={2.2} /> {slot}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <Button
          className="booking-confirm-btn"
          icon={CheckCircle}
          onClick={handleConfirm}
          loading={confirming}
          disabled={!selectedSlot}
        >
          Continue to Payment · ₹{BOOKING_PRICE}
        </Button>
      </div>

      <BookingSuccess
        open={success}
        onClose={() => setSuccess(false)}
        turf={activeTurf.name}
        day={formatBookingDate(selectedDay)}
        time={selectedSlot}
      />

      <PaymentMethodModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        amount={BOOKING_PRICE}
        label={`${activeTurf.name} · ${formatBookingDate(selectedDay)} ${selectedSlot || ""}`}
        confirming={payingBooking}
        onConfirm={handlePaymentConfirm}
      />

      <Modal open={phoneModalOpen} onClose={() => setPhoneModalOpen(false)} dismissible={!savingPhone}>
        <h2 style={{ marginBottom: 6 }}>Add Your Phone Number</h2>
        <p style={{ marginBottom: 18, color: "var(--color-subtext)", fontSize: 14 }}>
          We need a phone number on file so the cafe can reach you about this booking.
        </p>
        <form onSubmit={handleSavePhoneAndContinue}>
          <label className="login-label">Phone Number</label>
          <div className="login-phone-row">
            <select
              className="login-country-select"
              value={phoneCountryCode}
              onChange={(e) => setPhoneCountryCode(e.target.value)}
              aria-label="Country code"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input
              type="tel"
              placeholder={phoneCountryConfig.example}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
              maxLength={phoneCountryConfig.digits}
              required
              className="login-input"
            />
          </div>

          <Button
            type="submit"
            icon={Phone}
            loading={savingPhone}
            className="booking-confirm-btn"
          >
            Save &amp; Continue
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default Booking;
