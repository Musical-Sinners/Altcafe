import { Outlet } from "react-router-dom";
import Navbar from "../Components/Navbar";
import BottomNav from "../Components/BottomNav";
import OrderNotifier from "../Components/OrderNotifier";

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