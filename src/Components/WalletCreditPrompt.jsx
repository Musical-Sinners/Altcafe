import { Wallet } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import "./WalletCreditPrompt.css";

/**
 * Shown every time, right before payment. If the user has referral
 * wallet credit, it asks for explicit yes/no permission to spend it —
 * never applied silently. If they don't have any, it says so plainly
 * and just lets them continue to payment.
 */
function WalletCreditPrompt({ open, onClose, balance, total, onUse, onSkip, loading }) {
  const hasBalance = balance > 0;
  const applied = Math.min(balance, total);
  const remaining = Math.max(0, total - applied);

  return (
    <Modal open={open} onClose={onClose} dismissible={!loading}>
      <div className="wallet-prompt-icon">
        <Wallet size={22} strokeWidth={2} />
      </div>

      {hasBalance ? (
        <>
          <h2 style={{ marginBottom: 6 }}>Use Your Wallet Credit?</h2>
          <p className="wallet-prompt-copy">
            You have <strong>₹{balance}</strong> in referral wallet credit. It can only be used
            towards turf bookings and cafe orders — it can't be withdrawn.
          </p>

          <div className="wallet-prompt-breakdown">
            <div>
              <span>Order total</span>
              <span>₹{total}</span>
            </div>
            <div>
              <span>Wallet credit applied</span>
              <span>− ₹{applied}</span>
            </div>
            <div className="wallet-prompt-breakdown-final">
              <span>{remaining > 0 ? "You'll still pay" : "Fully covered by wallet"}</span>
              <span>₹{remaining}</span>
            </div>
          </div>

          <Button icon={Wallet} loading={loading} onClick={onUse} className="wallet-prompt-use-btn">
            Use ₹{applied} Wallet Credit
          </Button>
          <button type="button" className="wallet-prompt-skip-btn" onClick={onSkip} disabled={loading}>
            Don't use it this time
          </button>
        </>
      ) : (
        <>
          <h2 style={{ marginBottom: 6 }}>No Referral Wallet Credit</h2>
          <p className="wallet-prompt-copy">
            You don't have any referral wallet credit yet. Invite friends to earn credit you can
            use on turf bookings and cafe orders.
          </p>
          <Button icon={Wallet} loading={loading} onClick={onSkip} className="wallet-prompt-use-btn">
            Continue to Payment
          </Button>
        </>
      )}
    </Modal>
  );
}

export default WalletCreditPrompt;
