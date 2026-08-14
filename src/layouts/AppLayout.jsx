import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import OrderNotifier from "../components/OrderNotifier";

function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <OrderNotifier />
      <main className="app-layout-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default AppLayout;