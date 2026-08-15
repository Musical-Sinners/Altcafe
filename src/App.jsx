import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext";
import AppLayout from "./layouts/AppLayout";
import AdminLayout from "./layouts/AdminLayout";
import AudioUnlocker from "./Components/AudioUnlocker";
import Login from "./Pages/Login";
import Dashboard from "./Pages/Dashboard";
import Booking from "./Pages/Booking";
import Wallet from "./Pages/Wallet";
import HistoryPage from "./Pages/History";
import Cafe from "./Pages/Cafe";
import Profile from "./Pages/Profile";
import Reviews from "./Pages/Reviews";
import AboutUs from "./Pages/AboutUs";
import Admin from "./Pages/Admin";
import AdminUsers from "./Pages/AdminUsers";
import AdminBookings from "./Pages/AdminBookings";
import AdminCafe from "./Pages/AdminCafe";
import AdminWallet from "./Pages/AdminWallet";
import AdminRewards from "./Pages/AdminRewards";
import AdminReviews from "./Pages/AdminReviews";
import AdminAboutUs from "./Pages/AdminAboutUs";
import AdminSettings from "./Pages/AdminSettings";
import "./styles/theme.css";

function App() {
  return (
    <ToastProvider>
      <AudioUnlocker />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />

          {/* Pages that share the top navbar / bottom nav shell */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/cafe" element={<Cafe />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/about-us" element={<AboutUs />} />
          </Route>

          {/* Admin has its own sidebar shell, no navbar/bottom nav.
              AdminLayout gates every one of these behind the admin check. */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Admin />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="cafe" element={<AdminCafe />} />
            <Route path="wallet" element={<AdminWallet />} />
            <Route path="rewards" element={<AdminRewards />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="about-us" element={<AdminAboutUs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Catch-all: unmatched routes redirect instead of rendering blank */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;