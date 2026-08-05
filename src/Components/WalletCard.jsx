import { useEffect, useState } from "react";
import { Wallet as WalletIcon } from "lucide-react";
import "./WalletCard.css";

/**
 * The "stadium ticket" wallet card — signature element of the app.
 * Balance counts up like a scoreboard, capped by a progress rail,
 * torn from the stat strip below by a stitched perforation.
 */
function WalletCard({ balance, cap, referredCount }) {
  const [displayAmount, setDisplayAmount] = useState(0);
  const barWidth = Math.min((balance / cap) * 100, 100);

  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayAmount(Math.round(progress * balance));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [balance]);

  return (
    <div className="wallet-ticket">
      <div className="wallet-ticket-top">
        <div className="wallet-label">
          <WalletIcon size={14} strokeWidth={2.2} />
          WALLET BALANCE
        </div>

        <div className="wallet-amount">
          <span className="cur">৳</span>
          {displayAmount}
        </div>

        <p className="wallet-cap">Max balance limit ৳{cap}</p>

        <div className="wallet-bar">
          <div className="wallet-bar-fill" style={{ width: `${barWidth}%` }} />
        </div>

        <div className="wallet-stat-row">
          <div className="wallet-stat">
            <div className="wallet-stat-num">{referredCount}</div>
            <div className="wallet-stat-label">Referrals</div>
          </div>
          <div className="wallet-stat">
            <div className="wallet-stat-num">৳{referredCount * 100}</div>
            <div className="wallet-stat-label">Total Earned</div>
          </div>
        </div>
      </div>

      <div className="wallet-ticket-perf" />
    </div>
  );
}

export default WalletCard;