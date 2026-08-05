import { ArrowDownToLine, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Button from "../components/Button";
import "./Wallet.css";

const transactions = [
  { label: "Referral bonus — Rakib joined", amount: 100, date: "Today" },
  { label: "Referral bonus — Nabila joined", amount: 100, date: "Yesterday" },
  { label: "Welcome bonus", amount: 50, date: "3 days ago" },
];

function Wallet() {
  const balance = 250;

  return (
    <div className="wallet-page">
      <div className="wallet-inner">
        <h1>Wallet</h1>

        <div className="wallet-balance-card">
          <p className="wallet-balance-label">Available Balance</p>
          <p className="wallet-balance-amount">৳{balance}</p>
          <Button variant="secondary" icon={ArrowDownToLine} className="wallet-withdraw-btn">
            Withdraw
          </Button>
        </div>

        <section className="wallet-section">
          <h2>Transaction History</h2>
          <div className="surface-card wallet-history-card">
            {transactions.map((tx, i) => (
              <div key={i} className="wallet-tx-row">
                <span className="wallet-tx-icon">
                  {tx.amount >= 0 ? (
                    <ArrowUpRight size={16} strokeWidth={2.2} />
                  ) : (
                    <ArrowDownRight size={16} strokeWidth={2.2} />
                  )}
                </span>
                <div className="wallet-tx-body">
                  <span className="wallet-tx-label">{tx.label}</span>
                  <span className="wallet-tx-date">{tx.date}</span>
                </div>
                <span className={`wallet-tx-amount ${tx.amount >= 0 ? "tone-success" : "tone-danger"}`}>
                  {tx.amount >= 0 ? "+" : ""}৳{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Wallet;