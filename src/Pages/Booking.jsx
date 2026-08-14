import { useEffect, useMemo, useState } from "react";
import { MapPin, Clock, CheckCircle, Phone, ChevronLeft, ChevronRight, Volleyball } from "lucide-react";
import { auth } from "../firebase";
import { getUserProfile, updateUserProfile, addWalletTransaction, applyWalletCredit } from "../lib/userService";
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
  listenToBookingPrice,
  listenToBookingsForSlotState,
  listenToSlotConfig,
  listenToTurfPhotos,
  startOfMonth,
} from "../lib/bookingService";
import { COUNTRY_CODES, getCountryConfig } from "../lib/countryCodes";
import { useToast } from "../contexts/ToastContext";
import Button from "../components/Button";
import Modal from "../components/Modal";
import BookingSuccess from "../components/BookingSuccess";
import PaymentMethodModal from "../components/PaymentMethodModal";
import WalletCreditPrompt from "../components/WalletCreditPrompt";
import "./Booking.css";
import "./Login.css"; // reuses the phone-row / country-select input styles

function Booking() {
  const { showToast } = useToast();
  const [selectedTurf, setSelectedTurf] = useState(BOOKING_TURFS[0].id);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [success, setSuccess] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [turfPhotos, setTurfPhotos] = useState({});
  const [photoTick, setPhotoTick] = useState(0);

  useEffect(() => {
    const unsubscribe = listenToTurfPhotos(setTurfPhotos);
    return unsubscribe;
  }, []);

  // Live turf rent price — set by the admin in Settings. Falls back to
  // BOOKING_PRICE until the Firestore value loads (or if it's ever missing).
  const [bookingPrice, setBookingPrice] = useState(BOOKING_PRICE);
  useEffect(() => {
    const unsubscribe = listenToBookingPrice(setBookingPrice);
    return unsubscribe;
  }, []);

  // Advances every turf's photo gallery together, every 3s — turfs with
  // only one (or zero) photos just stay put since index % length is 0.
  useEffect(() => {
    const id = setInterval(() => setPhotoTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

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

  // Wallet credit (referral rewards) — asked once, right before payment,
  // never applied silently.
  const [walletPromptOpen, setWalletPromptOpen] = useState(false);
  const [walletCreditApplied, setWalletCreditApplied] = useState(0);
  const [walletChoiceLoading, setWalletChoiceLoading] = useState(false);

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

  const bookWithProfile = async (profile, paymentMethod, transactionId, creditApplied = 0) => {
    const currentUser = auth.currentUser;
    const remaining = bookingPrice - creditApplied;

    await createBooking(currentUser.uid, {
      turfId: activeTurf.id,
      turf: activeTurf.name,
      location: activeTurf.location,
      day: selectedDay,
      time: selectedSlot,
      price: bookingPrice,
      walletCreditApplied: creditApplied,
      userName: profile?.name || "",
      userContact: profile?.phone || profile?.email || "",
      paymentMethod: remaining === 0 ? "wallet" : paymentMethod,
      transactionId,
    });

    const label = `${activeTurf.name} · ${formatBookingDate(selectedDay)} ${selectedSlot}`;

    // The wallet-credit portion actually reduces the real balance (it's
    // real money already given to them). The cash/QR portion is only
    // logged for the Wallet/History pages — it was never held as balance.
    if (creditApplied > 0) {
      await applyWalletCredit(currentUser.uid, creditApplied, `${label} (wallet credit)`);
    }
    if (remaining > 0) {
      await addWalletTransaction(currentUser.uid, { label, amount: -remaining });
    }

    setSuccess(true);
  };

  // Step 1: validate + fetch profile, then either gate on phone number or
  // move to the wallet-credit prompt (if they have any) / payment step.
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
      proceedPastPhoneGate(profile);
    } catch (err) {
      console.error(err);
      showToast("Could not start booking. Please try again.", "error");
    } finally {
      setConfirming(false);
    }
  };

  // Shared next-step logic once we know the user's phone is on file —
  // asks about wallet credit first if they have any, otherwise goes
  // straight to picking a payment method.
  const proceedPastPhoneGate = (profile) => {
    setPendingProfile(profile);
    setWalletCreditApplied(0);
    setWalletPromptOpen(true);
  };

  const handleUseWalletCredit = async () => {
    const applied = Math.min(pendingProfile?.wallet_balance || 0, bookingPrice);
    setWalletCreditApplied(applied);
    setWalletPromptOpen(false);

    if (applied >= bookingPrice) {
      // Wallet fully covers it — no cash/QR step needed at all.
      setWalletChoiceLoading(true);
      try {
        await bookWithProfile(pendingProfile, "wallet", "", applied);
      } catch (err) {
        console.error(err);
        if (err.message === "slot-already-booked" || err.message === "slot-closed") {
          showToast("That slot was just taken. Please pick another.", "error");
        } else {
          showToast("Could not confirm booking. Please try again.", "error");
        }
      } finally {
        setWalletChoiceLoading(false);
      }
    } else {
      setPaymentModalOpen(true);
    }
  };

  const handleSkipWalletCredit = () => {
    setWalletCreditApplied(0);
    setWalletPromptOpen(false);
    setPaymentModalOpen(true);
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
      proceedPastPhoneGate(profile);
    } catch (err) {
      console.error(err);
      showToast("Could not save your phone number. Please try again.", "error");
    } finally {
      setSavingPhone(false);
    }
  };

  // Step 2: called once the user picks QR or Cash and taps confirm — this
  // is the point where the booking actually gets written to Firestore.
  const handlePaymentConfirm = async (method, transactionId) => {
    setPayingBooking(true);
    try {
      await bookWithProfile(pendingProfile, method, transactionId, walletCreditApplied);
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
          {BOOKING_TURFS.map((turf) => {
            const photos = turfPhotos[turf.id] || [];
            const activePhoto = photos.length ? photos[photoTick % photos.length] : null;
            return (
              <button
                key={turf.id}
                className={`turf-card ${selectedTurf === turf.id ? "selected" : ""}`}
                onClick={() => setSelectedTurf(turf.id)}
              >
                <div className="turf-card-photo">
                  {activePhoto ? <img src={activePhoto} alt={turf.name} /> : <Volleyball size={44} strokeWidth={1.6} />}
                  {photos.length > 1 && (
                    <div className="turf-card-photo-dots">
                      {photos.map((p, i) => (
                        <span key={p} className={i === photoTick % photos.length ? "active" : ""} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="turf-card-body">
                  <div className="turf-card-name">{turf.name}</div>
                  <div className="turf-card-meta">
                    <MapPin size={10} strokeWidth={2.2} /> {turf.location}
                  </div>
                </div>
              </button>
            );
          })}
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
          Continue to Payment · ₹{bookingPrice}
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
        amount={bookingPrice - walletCreditApplied}
        label={`${activeTurf.name} · ${formatBookingDate(selectedDay)} ${selectedSlot || ""}`}
        confirming={payingBooking}
        onConfirm={handlePaymentConfirm}
      />

      <WalletCreditPrompt
        open={walletPromptOpen}
        onClose={() => setWalletPromptOpen(false)}
        balance={pendingProfile?.wallet_balance || 0}
        total={bookingPrice}
        onUse={handleUseWalletCredit}
        onSkip={handleSkipWalletCredit}
        loading={walletChoiceLoading}
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
