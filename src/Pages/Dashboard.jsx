import { Volleyball, UserPlus, History, Wallet, Trophy } from "lucide-react";
import WalletCard from "../components/WalletCard";
import ReferralCard from "../components/ReferralCard";
import StatCard from "../components/StatCard";
import "./Dashboard.css";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function Dashboard() {
  const user = {
    name: "Shadman",
    referralCode: "SHADMAN123",
    walletBalance: 250,
    walletCap: 1500,
    referredCount: 4,
  };

  const referralLink = `https://cafe-turf-referral.vercel.app/signup?ref=${user.referralCode}`;

  const activity = [
    { label: "Turf A booked — 6 PM Saturday", amount: "-৳600", tone: "danger" },
    { label: "Referral bonus — Rakib joined", amount: "+৳100", tone: "success" },
    { label: "Cafe order — Cold Brew x2", amount: "-৳240", tone: "danger" },
  ];

  const leaderboard = [
    { rank: 1, name: "Farhan", referrals: 12 },
    { rank: 2, name: "Shadman", referrals: 4, isYou: true },
    { rank: 3, name: "Mim", referrals: 3 },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <section className="dashboard-greeting">
          <h1>Hello {user.name} 👋</h1>
          <p>{getGreeting()}</p>
        </section>

        <WalletCard
          balance={user.walletBalance}
          cap={user.walletCap}
          referredCount={user.referredCount}
        />

        <section className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="dashboard-quick-grid">
            <StatCard to="/booking" icon={Volleyball} label="Book Turf" />
            <StatCard to="/dashboard" icon={UserPlus} label="Invite Friend" />
            <StatCard to="/history" icon={History} label="History" />
            <StatCard to="/wallet" icon={Wallet} label="Wallet" />
          </div>
        </section>

        <section className="dashboard-section">
          <ReferralCard referralCode={user.referralCode} referralLink={referralLink} />
        </section>

        <section className="dashboard-section">
          <h2>Recent Activity</h2>
          <div className="surface-card dashboard-activity-card">
            {activity.map((item, i) => (
              <div key={i} className="activity-row">
                <span>{item.label}</span>
                <span className={`activity-amount tone-${item.tone}`}>{item.amount}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <h2>Leaderboard</h2>
          <div className="surface-card dashboard-leaderboard-card">
            {leaderboard.map((row) => (
              <div key={row.rank} className={`leaderboard-row ${row.isYou ? "is-you" : ""}`}>
                <span className="leaderboard-rank">
                  {row.rank === 1 ? <Trophy size={16} strokeWidth={2.2} /> : `#${row.rank}`}
                </span>
                <span className="leaderboard-name">{row.name}{row.isYou && " (You)"}</span>
                <span className="leaderboard-count">{row.referrals} referrals</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;