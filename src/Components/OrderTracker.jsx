import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ORDER_PHASES, ORDER_PHASE_LABELS } from "../lib/cafeService";
import "./OrderTracker.css";

/**
 * Reads an order's phase in a way that's safe for orders created before
 * the token/phase system existed (they only have a "placed"/"done" status).
 */
function resolvePhase(order) {
  if (order.phase) return order.phase;
  return order.status === "done" ? "completed" : "placed";
}

function OrderTracker({ order, compact = false }) {
  if (!order) return null;

  const phase = resolvePhase(order);
  const cancelled = phase === "cancelled";
  const stepIndex = ORDER_PHASES.indexOf(phase);
  const itemsLabel = (order.items || []).map((i) => `${i.name} x${i.qty}`).join(", ");

  return (
    <div className={`order-tracker surface-card ${compact ? "compact" : ""}`}>
      <div className="order-tracker-top">
        <div>
          <span className="order-tracker-label">Token</span>
          <span className="order-tracker-token">#{order.token ?? "—"}</span>
        </div>
        <div className="order-tracker-meta">
          <span className="order-tracker-items">{itemsLabel}</span>
          <span className="order-tracker-total">₹{order.total}</span>
        </div>
      </div>

      {cancelled ? (
        <div className="order-tracker-cancelled">
          <XCircle size={16} strokeWidth={2.2} /> Order cancelled
        </div>
      ) : (
        <>
          <div className="order-tracker-steps">
            {ORDER_PHASES.map((p, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={p} className={`order-tracker-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
                  <span className="order-tracker-dot">
                    {done ? <CheckCircle2 size={13} strokeWidth={2.4} /> : null}
                  </span>
                  <span className="order-tracker-step-label">{ORDER_PHASE_LABELS[p]}</span>
                </div>
              );
            })}
          </div>

          {phase !== "completed" && (
            <div className="order-tracker-eta">
              <Clock size={14} strokeWidth={2.2} />
              Approx. {order.estimatedMinutes ?? 10} min · {ORDER_PHASE_LABELS[phase]}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default OrderTracker;
