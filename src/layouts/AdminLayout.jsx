import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { auth } from "../firebase";
import { canAccessAdmin } from "../lib/adminConfig";
import { useToast } from "../contexts/ToastContext";
import AdminSidebar from "../Components/AdminSidebar";
import Skeleton from "../Components/Skeleton";
import "../pages/Admin.css";

/**
 * Shared shell for every /admin/* page: sidebar + the "are you actually
 * the admin" check. Nothing inside <Outlet /> ever renders until this
 * check passes, so no admin-only data flashes on screen for a non-admin
 * before they get redirected.
 */
function AdminLayout() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      canAccessAdmin(user.email)
        .then((allowed) => {
          if (!allowed) {
            showToast("You are not admin, please go to Dashboard.", "error");
            navigate("/dashboard");
            return;
          }
          setChecking(false);
        })
        .catch((err) => {
          console.error(err);
          navigate("/dashboard");
        });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (checking) {
    return (
      <div className="admin-shell">
        <div className="admin-main" style={{ width: "100%" }}>
          <Skeleton height={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-title-row">
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={16} strokeWidth={2.2} />
            Log Out
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
