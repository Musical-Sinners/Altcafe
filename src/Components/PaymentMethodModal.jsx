import { useEffect, useState } from "react";
import { QrCode, Banknote, CheckCircle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { DEFAULT_PAYMENT_QR, listenToPaymentConfig } from "../lib/paymentConfig";
import "./PaymentMethodModal.css";

/**
 * Payment-method step shown right before a booking/order is finalized.
 * "cash" places the booking/order right away, but it stays PENDING until
 * an admin confirms it. "qr" shows the admin-configured QR code — the
 * customer scans & pays externally, then must type in the transaction ID
 * before they can confirm; without a transaction ID nothing gets placed.
 * A QR booking/order is also created as PENDING, since the transaction ID
 * still needs to be checked by an admin against the actual payment.
 * Either way the chosen method (+ transaction ID for qr) is passed up via
 * onConfirm(method, transactionId) so the caller can store it on the doc.
 */
function PaymentMethodModal({ open, onClose, amount, label, confirming, onConfirm }) {
  const [method, setMethod] = useState("cash");
  const [paymentConfig, setPaymentConfig] = useState(DEFAULT_PAYMENT_QR);
  const [transactionId, setTransactionId] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const unsubscribe = listenToPaymentConfig(setPaymentConfig);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (open) {
      setMethod("cash");
      setTransactionId("");
      setTouched(false);
    }
  }, [open]);

  const trimmedTxnId = transactionId.trim();
  const qrNeedsTxnId = method === "qr" && !trimmedTxnId;

  const handleConfirmClick = () => {
    if (qrNeedsTxnId) {
      setTouched(true);
      return;
    }
    onConfirm(method, method === "qr" ? trimmedTxnId : "");
  };

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

      {method === "qr" && (
        <div className="pm-txn-field">
          <label className="pm-txn-label" htmlFor="pm-txn-id">
            Transaction ID
          </label>
          <input
            id="pm-txn-id"
            type="text"
            className={`pm-txn-input ${touched && qrNeedsTxnId ? "error" : ""}`}
            placeholder="Enter the transaction ID from your payment"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {touched && qrNeedsTxnId && (
            <span className="pm-txn-error">Transaction ID is required to continue.</span>
          )}
        </div>
      )}

      <p className="pm-qr-note">
        {method === "qr"
          ? "Scan the QR, pay ₹" + amount + ", then enter your transaction ID above."
          : "Pay in cash at the counter when you arrive. An admin will confirm it."}
      </p>

      <Button
        icon={CheckCircle}
        loading={confirming}
        onClick={handleConfirmClick}
        disabled={qrNeedsTxnId}
        style={{ width: "100%" }}
      >
        {method === "qr" ? "I've Paid — Submit" : "Confirm · Pay with Cash"}
      </Button>
    </Modal>
  );
}

export default PaymentMethodModal;
