import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { listenToActiveUserOrders, ORDER_PHASE_LABELS } from "../lib/cafeService";
import { useToast } from "../contexts/ToastContext";

/**
 * Mounted once at the app shell. Silently watches the logged-in user's
 * active cafe orders and pops a toast whenever the admin moves one to a
 * new phase (accepted / preparing / ready / completed). The very first
 * "Order Placed" toast + token is already shown by the Cafe page itself
 * at the moment of ordering, so this only reacts to phase *changes* —
 * on first sight of an order (e.g. right after login, or page refresh)
 * it just records the current phase as the baseline, silently.
 */
function OrderNotifier() {
  const { showToast } = useToast();
  const knownPhases = useRef(new Map()); // orderId -> last-seen phase

  useEffect(() => {
    let unsubOrders = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubOrders();
      knownPhases.current.clear();
      if (!user) return;

      unsubOrders = listenToActiveUserOrders(user.uid, (orders) => {
        orders.forEach((order) => {
          const phase = order.phase || "placed";
          const prevPhase = knownPhases.current.get(order.id);
          knownPhases.current.set(order.id, phase);

          if (prevPhase !== undefined && prevPhase !== phase) {
            showToast(`Order #${order.token}: ${ORDER_PHASE_LABELS[phase] || phase}`, "info");
          }
        });
      });
    });

    return () => {
      unsubOrders();
      unsubAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default OrderNotifier;
