import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";

function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-layout-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default AppLayout;