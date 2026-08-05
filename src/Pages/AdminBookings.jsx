import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { getAllBookings } from "../lib/bookingService";
import Skeleton from "../components/Skeleton";
import "./Admin.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllBookings().then((data) => {
      setBookings(data);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <h1 className="admin-title">Bookings ({bookings.length})</h1>

      <div className="admin-users-card surface-card">
        {loading ? (
          <Skeleton height={200} />
        ) : bookings.length === 0 ? (
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
                <th>Turf</th>
                <th>Location</th>
                <th>Date</th>
                <th>Time</th>
                <th>Price</th>
                <th>Booked On</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.userName || b.userContact || "—"}</td>
                  <td>{b.turf}</td>
                  <td>{b.location}</td>
                  <td>{b.day}</td>
                  <td>{b.time}</td>
                  <td>₹{b.price}</td>
                  <td>{formatDate(b.created_at)}</td>
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
