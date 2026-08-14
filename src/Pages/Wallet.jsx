import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { auth } from "../firebase";
import { getUserProfile, getWalletTransactions } from "../lib/userService";
import { useToast } from "../contexts/ToastContext";
import Button from "../Components/Button";
import Skeleton from "../Components/Skeleton";
import "./Wallet.css";

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Wallet() {
  const { showToast } = useToast();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const [profile, txs] = await Promise.all([
        getUserProfile(currentUser.uid),
        getWalletTransactions(currentUser.uid),
      ]);
      setBalance(profile?.wallet_balance || 0);
      setTransactions(txs);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="wallet-page">
        <div className="wallet-inner">
          <Skeleton height={160} />
          <div style={{ marginTop: 28 }}>
            <Skeleton height={140} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <div className="wallet-inner">
        <h1>Wallet</h1>

        <div className="wallet-balance-card">
          <p className="wallet-balance-label">Available Balance</p>
          <p className="wallet-balance-amount">₹{balance}</p>
          <Button
            variant="secondary"
            icon={ArrowDownToLine}
            className="wallet-withdraw-btn"
            onClick={() =>
              showToast("Wallet credit can only be used for turf bookings and cafe orders — it can't be withdrawn.", "info")
            }
          >
            Withdraw
          </Button>
        </div>
        <p className="wallet-credit-note">
          Referral wallet credit can be spent on turf bookings and cafe orders only — it can't be withdrawn as cash.
        </p>

        <section className="wallet-section">
          <h2>Transaction History</h2>
          {transactions.length === 0 ? (
            <div className="surface-card wallet-history-card">
              <p style={{ color: "var(--color-subtext)", fontSize: 14 }}>
                No transactions yet. Refer a friend or book a turf to see activity here.
              </p>
            </div>
          ) : (
            <div className="surface-card wallet-history-card">
              {transactions.map((tx) => (
                <div key={tx.id} className="wallet-tx-row">
                  <span className="wallet-tx-icon">
                    {tx.amount >= 0 ? (
                      <ArrowUpRight size={16} strokeWidth={2.2} />
                    ) : (
                      <ArrowDownRight size={16} strokeWidth={2.2} />
                    )}
                  </span>
                  <div className="wallet-tx-body">
                    <span className="wallet-tx-label">{tx.label}</span>
                    <span className="wallet-tx-date">{formatDate(tx.created_at)}</span>
                  </div>
                  <span className={`wallet-tx-amount ${tx.amount >= 0 ? "tone-success" : "tone-danger"}`}>
                    {tx.amount >= 0 ? "+" : ""}₹{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Wallet;
