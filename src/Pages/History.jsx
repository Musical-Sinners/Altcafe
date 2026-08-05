import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, History as HistoryIcon } from "lucide-react";
import { auth } from "../firebase";
import { getWalletTransactions } from "../lib/userService";
import Skeleton from "../components/Skeleton";
import "./History.css";

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function History() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const txs = await getWalletTransactions(currentUser.uid);
      setTransactions(txs);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="history-page">
      <div className="history-inner">
        <h1>History</h1>

        {loading ? (
          <>
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </>
        ) : transactions.length === 0 ? (
          <div className="surface-card history-empty">
            <HistoryIcon size={28} strokeWidth={1.8} />
            <p>No activity yet</p>
            <span>Bookings, cafe orders, and referral bonuses will show up here.</span>
          </div>
        ) : (
          <div className="surface-card history-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="history-row">
                <span className="history-row-icon">
                  {tx.amount >= 0 ? (
                    <ArrowUpRight size={16} strokeWidth={2.2} />
                  ) : (
                    <ArrowDownRight size={16} strokeWidth={2.2} />
                  )}
                </span>
                <div className="history-row-body">
                  <span className="history-row-label">{tx.label}</span>
                  <span className="history-row-date">{formatDate(tx.created_at)}</span>
                </div>
                <span className={`history-row-amount ${tx.amount >= 0 ? "tone-success" : "tone-danger"}`}>
                  {tx.amount >= 0 ? "+" : ""}₹{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
