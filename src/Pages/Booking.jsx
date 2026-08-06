import { useState } from "react";
import { MapPin, Clock, CheckCircle, Phone } from "lucide-react";
import { auth } from "../firebase";
import { getUserProfile, updateUserProfile } from "../lib/userService";
import { createBooking } from "../lib/bookingService";
import { COUNTRY_CODES, getCountryConfig } from "../lib/countryCodes";
import { useToast } from "../contexts/ToastContext";
import Button from "../components/Button";
import Modal from "../components/Modal";
import BookingSuccess from "../components/BookingSuccess";
import "./Booking.css";
import "./Login.css"; // reuses the phone-row / country-select input styles

const turfs = [
  { id: "a", name: "Turf A", location: "Savar", status: "available", nextSlot: "6:00 PM" },
  { id: "b", name: "Turf B", location: "Savar", status: "booked", nextSlot: "Booked till 8 PM" },
  { id: "c", name: "Turf C", location: "Dhanmondi", status: "available", nextSlot: "7:30 PM" },
];

const days = ["Thu 6", "Fri 7", "Sat 8", "Sun 9", "Mon 10"];
const slots = ["4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"];
const PRICE = 600;

function Booking() {
  const { showToast } = useToast();
  const [selectedTurf, setSelectedTurf] = useState("a");
  const [selectedDay, setSelectedDay] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState("6:00 PM");
  const [success, setSuccess] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Phone-number gate: a turf booking always needs a contact number on file
  // so the cafe can reach the user about it. If the signed-in profile
  // doesn't have one yet, we pause the booking and ask for it here instead
  // of letting a booking go through with no way to contact the user.
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState("+880");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const phoneCountryConfig = getCountryConfig(phoneCountryCode);

  const activeTurf = turfs.find((t) => t.id === selectedTurf);

  const bookWithProfile = async (profile) => {
    const currentUser = auth.currentUser;
    await createBooking(currentUser.uid, {
      turf: activeTurf.name,
      location: activeTurf.location,
      day: days[selectedDay],
      time: selectedSlot,
      price: PRICE,
      userName: profile?.name || "",
      userContact: profile?.phone || profile?.email || "",
    });
    setSuccess(true);
  };

  const handleConfirm = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast("Please log in again to book.", "error");
      return;
    }
    setConfirming(true);
    try {
      const profile = await getUserProfile(currentUser.uid);
      if (!profile?.phone) {
        // No phone on file — stop here and ask for one before booking.
        setPhoneModalOpen(true);
        return;
      }
      await bookWithProfile(profile);
    } catch (err) {
      console.error(err);
      showToast("Could not confirm booking. Please try again.", "error");
    } finally {
      setConfirming(false);
    }
  };

  const handleSavePhoneAndBook = async (e) => {
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
      await bookWithProfile(profile);
    } catch (err) {
      console.error(err);
      showToast("Could not save your phone number. Please try again.", "error");
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <div className="booking-page">
      <div className="booking-inner">
        <h1 className="booking-title">Available Turfs</h1>

        <div className="turf-list">
          {turfs.map((turf) => (
            <button
              key={turf.id}
              className={`turf-card ${selectedTurf === turf.id ? "selected" : ""} ${turf.status === "booked" ? "disabled" : ""}`}
              onClick={() => turf.status === "available" && setSelectedTurf(turf.id)}
              disabled={turf.status === "booked"}
            >
              <div className="turf-card-icon">⚽</div>
              <div className="turf-card-body">
                <div className="turf-card-name">{turf.name}</div>
                <div className="turf-card-meta">
                  <MapPin size={13} strokeWidth={2.2} /> {turf.location}
                </div>
              </div>
              <div className={`turf-card-status ${turf.status}`}>
                {turf.status === "available" ? (
                  <>Available · {turf.nextSlot}</>
                ) : (
                  turf.nextSlot
                )}
              </div>
            </button>
          ))}
        </div>

        <section className="booking-section">
          <h2>Calendar</h2>
          <div className="date-strip">
            {days.map((d, i) => (
              <button
                key={d}
                className={`date-chip ${selectedDay === i ? "selected" : ""}`}
                onClick={() => setSelectedDay(i)}
              >
                <span>{d.split(" ")[0]}</span>
                <strong>{d.split(" ")[1]}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="booking-section">
          <h2>Time Slots</h2>
          <div className="slot-grid">
            {slots.map((slot) => (
              <button
                key={slot}
                className={`slot-chip ${selectedSlot === slot ? "selected" : ""}`}
                onClick={() => setSelectedSlot(slot)}
              >
                <Clock size={13} strokeWidth={2.2} /> {slot}
              </button>
            ))}
          </div>
        </section>

        <Button
          className="booking-confirm-btn"
          icon={CheckCircle}
          onClick={handleConfirm}
          loading={confirming}
        >
          Confirm Booking · ₹{PRICE}
        </Button>
      </div>

      <BookingSuccess
        open={success}
        onClose={() => setSuccess(false)}
        turf={activeTurf.name}
        day={days[selectedDay]}
        time={selectedSlot}
      />

      <Modal open={phoneModalOpen} onClose={() => setPhoneModalOpen(false)} dismissible={!savingPhone}>
        <h2 style={{ marginBottom: 6 }}>Add Your Phone Number</h2>
        <p style={{ marginBottom: 18, color: "var(--color-subtext)", fontSize: 14 }}>
          We need a phone number on file so the cafe can reach you about this booking.
        </p>
        <form onSubmit={handleSavePhoneAndBook}>
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
            Save &amp; Confirm Booking
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default Booking;