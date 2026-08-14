import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext";
import AppLayout from "./layouts/AppLayout";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import Wallet from "./pages/Wallet";
import HistoryPage from "./pages/History";
import Cafe from "./pages/Cafe";
import Profile from "./pages/Profile";
import Reviews from "./pages/Reviews";
import AboutUs from "./pages/AboutUs";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/AdminUsers";
import AdminBookings from "./pages/AdminBookings";
import AdminCafe from "./pages/AdminCafe";
import AdminWallet from "./pages/AdminWallet";
import AdminRewards from "./pages/AdminRewards";
import AdminReviews from "./pages/AdminReviews";
import AdminSettings from "./pages/AdminSettings";
import "./styles/theme.css";

function App() {
  return (
    <ToastProvider>
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