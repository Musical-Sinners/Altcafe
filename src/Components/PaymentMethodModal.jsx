import { useEffect, useState } from "react";
import { QrCode, Banknote, CheckCircle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { DEFAULT_PAYMENT_QR, listenToPaymentConfig } from "../lib/paymentConfig";
import "./PaymentMethodModal.css";

/**
 * Payment-method step shown right before a booking/order is finalized.
 * "cash" confirms immediately. "qr" shows the admin-configured QR code —
 * the customer scans & pays externally, then taps "I've Paid" to confirm.
 * Either way the chosen method is passed up via onConfirm(method) so the
 * caller can store it on the booking/order doc.
 */
function PaymentMethodModal({ open, onClose, amount, label, confirming, onConfirm }) {
  const [method, setMethod] = useState("cash");
  const [paymentConfig, setPaymentConfig] = useState(DEFAULT_PAYMENT_QR);

  useEffect(() => {
    const unsubscribe = listenToPaymentConfig(setPaymentConfig);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (open) setMethod("cash");
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} dismissible={!confirming}>
      <h2 className="pm-title">Choose Payment Method</h2>
      <p className="pm-amount">
        {label} · <strong>₹{amount}</strong>
      </p>

      <div className="pm-options">
        <button
          type="button"
          className={`pm-option ${method === "qr" ? "selected" : ""}`}
          onClick={() => setMethod("qr")}
        >
          <QrCode size={22} strokeWidth={2} />
          Pay via QR
        </button>
        <button
          type="button"
          className={`pm-option ${method === "cash" ? "selected" : ""}`}
          onClick={() => setMethod("cash")}
        >
          <Banknote size={22} strokeWidth={2} />
          Cash
        </button>
      </div>

      {method === "qr" && (
        <div className="pm-qr-box">
          <img src={paymentConfig.qrImageUrl} alt="Payment QR code" />
          {paymentConfig.payeeName && <span className="pm-qr-payee">{paymentConfig.payeeName}</span>}
        </div>
      )}

      <p className="pm-qr-note">
        {method === "qr"
          ? "Scan the QR, pay ₹" + amount + ", then confirm below."
          : "Pay in cash at the counter when you arrive."}
      </p>

      <Button icon={CheckCircle} loading={confirming} onClick={() => onConfirm(method)} style={{ width: "100%" }}>
        {method === "qr" ? "I've Paid — Confirm" : "Confirm · Pay with Cash"}
      </Button>
    </Modal>
  );
}

export default PaymentMethodModal;
