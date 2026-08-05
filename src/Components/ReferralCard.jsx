import { useState } from "react";
import QRCode from "react-qr-code";
import { Copy, Check, Share2, Gift } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import Button from "./Button";
import "./ReferralCard.css";

function ReferralCard({ referralCode, referralLink }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const whatsappMessage = `Sign up with my referral code and get a discount on your first booking: ${referralLink}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    showToast("Referral code copied");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="referral-card surface-card">
      <div className="referral-head">
        <span className="referral-icon">
          <Gift size={18} strokeWidth={2.1} />
        </span>
        <div>
          <h2 style={{ fontSize: 17 }}>Invite Friends</h2>
          <p className="referral-sub">Earn ৳100 every successful referral</p>
        </div>
      </div>

      <div className="referral-body">
        <div className="referral-code-block">
          <p className="referral-code-label">Your Referral Code</p>
          <p className="referral-code">{referralCode}</p>

          <div className="referral-actions">
            <Button
              variant={copied ? "primary" : "ghost"}
              size="sm"
              icon={copied ? Check : Copy}
              onClick={handleCopy}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" icon={Share2}>
                Share
              </Button>
            </a>
          </div>
        </div>

        <div className="referral-qr">
          <QRCode value={referralLink} size={104} fgColor="#0f5132" bgColor="#ffffff" />
        </div>
      </div>
    </div>
  );
}

export default ReferralCard;