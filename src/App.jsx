import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import Wallet from "./pages/Wallet";
import Cafe from "./pages/Cafe";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
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
            <Route path="/cafe" element={<Cafe />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Admin has its own sidebar shell, no navbar/bottom nav */}
          <Route path="/admin" element={<Admin />} />

          {/* Catch-all: unmatched routes redirect instead of rendering blank */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;