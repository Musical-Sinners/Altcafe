import { useEffect, useState } from "react";
import { Volleyball, UserPlus, History, Wallet } from "lucide-react";
import { auth } from "../firebase";
import { getUserProfile } from "../lib/userService";
import WalletCard from "../Components/WalletCard";
import ReferralCard from "../Components/ReferralCard";
import StatCard from "../Components/StatCard";
import Skeleton from "../Components/Skeleton";
import "./Dashboard.css";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// Business rule from the project spec: wallet balance is capped at ₹500.
const WALLET_CAP = 500;

function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const data = await getUserProfile(currentUser.uid);
      setProfile(data);
      setLoading(false);
    };
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <Skeleton height={80} />
          <Skeleton height={140} />
          <Skeleton height={200} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <p>Couldn't load your profile. Please try logging in again.</p>
        </div>
      </div>
    );
  }

  const displayName = profile.name || profile.phone || profile.email || "there";
  const referralLink = `${window.location.origin}/login?ref=${profile.referral_code}`;

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <section className="dashboard-greeting">
          <h1>Hello {displayName} 👋</h1>
          <p>{getGreeting()}</p>
        </section>

        <WalletCard
          balance={profile.wallet_balance || 0}
          cap={WALLET_CAP}
          referredCount={profile.referral_count || 0}
        />

        <section className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="dashboard-quick-grid">
            <StatCard to="/booking" icon={Volleyball} label="Book Turf" />
            <StatCard
              onClick={() =>
                document.getElementById("referral-section")?.scrollIntoView({ behavior: "smooth" })
              }
              icon={UserPlus}
              label="Invite Friend"
            />
            <StatCard to="/history" icon={History} label="History" />
            <StatCard to="/wallet" icon={Wallet} label="Wallet" />
          </div>
        </section>

        <section className="dashboard-section" id="referral-section">
          <ReferralCard referralCode={profile.referral_code} referralLink={referralLink} />
        </section>

        {/*
          Recent Activity and Leaderboard will connect to the
          `transactions` collection and a computed leaderboard query once
          Booking/Wallet write real data. Left out for now rather than
          showing fake numbers.
        */}
      </div>
    </div>
  );
}

export default Dashboard;
