import { useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Volleyball, Gift, Coffee } from "lucide-react";
import Button from "../components/Button";
import "./Login.css";

function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [step, setStep] = useState("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const fullPhoneNumber = `+88${phone}`;
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);
      setStep("otp");
    } catch (err) {
      console.error(err);
      setError("Could not send OTP. Please check the phone number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Incorrect OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow" />

      <div className="login-card">
        <div className="login-ball">⚽</div>
        <h1 className="login-title">Kick Off Your Rewards</h1>

        <div className="login-pitch-list">
          <span><Volleyball size={14} strokeWidth={2.2} /> Book Turf</span>
          <span><Gift size={14} strokeWidth={2.2} /> Earn Rewards</span>
          <span><Coffee size={14} strokeWidth={2.2} /> Enjoy Coffee</span>
        </div>

        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="login-form">
            <label className="login-label">Phone Number</label>
            <div className="login-phone-row">
              <span className="login-prefix">+880</span>
              <input
                type="tel"
                placeholder="1XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="login-input"
              />
            </div>
            <Button
              type="submit"
              icon={ArrowRight}
              iconPosition="right"
              loading={loading}
              className="login-submit"
            >
              Continue
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <label className="login-label">Enter OTP</label>
            <input
              type="text"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="login-input login-input-otp"
            />
            <Button
              type="submit"
              icon={ArrowRight}
              iconPosition="right"
              loading={loading}
              className="login-submit"
            >
              Verify
            </Button>
          </form>
        )}

        {error && <p className="login-error">{error}</p>}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default Login;