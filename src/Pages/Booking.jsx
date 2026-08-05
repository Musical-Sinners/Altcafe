import { useState } from "react";
import { MapPin, Clock, CheckCircle } from "lucide-react";
import Button from "../components/Button";
import BookingSuccess from "../components/BookingSuccess";
import "./Booking.css";

const turfs = [
  { id: "a", name: "Turf A", location: "Savar", status: "available", nextSlot: "6:00 PM" },
  { id: "b", name: "Turf B", location: "Savar", status: "booked", nextSlot: "Booked till 8 PM" },
  { id: "c", name: "Turf C", location: "Dhanmondi", status: "available", nextSlot: "7:30 PM" },
];

const days = ["Thu 6", "Fri 7", "Sat 8", "Sun 9", "Mon 10"];
const slots = ["4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"];

function Booking() {
  const [selectedTurf, setSelectedTurf] = useState("a");
  const [selectedDay, setSelectedDay] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState("6:00 PM");
  const [success, setSuccess] = useState(false);

  const activeTurf = turfs.find((t) => t.id === selectedTurf);

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
          onClick={() => setSuccess(true)}
        >
          Confirm Booking · ৳600
        </Button>
      </div>

      <BookingSuccess
        open={success}
        onClose={() => setSuccess(false)}
        turf={activeTurf.name}
        day={days[selectedDay]}
        time={selectedSlot}
      />
    </div>
  );
}

export default Booking;