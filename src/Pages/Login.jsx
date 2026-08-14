import { useEffect, useState } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  linkWithCredential,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import {
  createUserProfileIfNeeded,
  getRemovedUserByEmail,
  getUserRecord,
  restoreRemovedUserProfile,
} from "../lib/userService";
import { canAccessAdmin } from "../lib/adminConfig";
import { COUNTRY_CODES, getCountryConfig } from "../lib/countryCodes";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Volleyball, Gift, Coffee, Mail, Link2 } from "lucide-react";
import Button from "../Components/Button";
import "./Login.css";

// Phone numbers can't have a "password" in Firebase natively — Firebase
// Phone Auth is OTP-only. To support "phone + password" login, we create a
// normal Firebase email/password account behind the scenes using a fake
// address built from the phone number. The user never sees this address —
// they only ever type their phone number and password.
function phoneToFakeEmail(fullPhoneNumber) {
  const digitsOnly = fullPhoneNumber.replace(/[^0-9]/g, "");
  return `${digitsOnly}@phone.cafeturf.local`;
}

function Login() {
  const [loginMethod, setLoginMethod] = useState("phone"); // "phone" | "email"
  const [searchParams] = useSearchParams();
  const referralCodeFromLink = (searchParams.get("ref") || "").trim().toUpperCase();

  // phone flow state
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [phoneReferralCode, setPhoneReferralCode] = useState("");
  const [phoneStep, setPhoneStep] = useState("enter"); // "enter" | "otp" | "login"
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [pendingPhonePassword, setPendingPhonePassword] = useState("");

  // email flow state
  const [email, setEmail] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailReferralCode, setEmailReferralCode] = useState("");
  // Default to "login" instead of "signup" — most people opening this page
  // already have an account. Defaulting to "signup" meant returning users
  // kept hitting "email already in use" every time they landed here fresh.
  const [emailMode, setEmailMode] = useState("login"); // "signup" | "login" | "reset"

  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const countryConfig = getCountryConfig(countryCode);

  useEffect(() => {
    if (!referralCodeFromLink) return;
    setPhoneReferralCode(referralCodeFromLink);
    setEmailReferralCode(referralCodeFromLink);
    setEmailMode("signup");
    setLoginMethod("email");
  }, [referralCodeFromLink]);

  const resetMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const getPostLoginPath = async (userEmail) => {
    const allowed = await canAccessAdmin(userEmail);
    return allowed ? "/admin" : "/dashboard";
  };

  const handleRemovedAccount = async () => {
    await signOut(auth);
    setError(
      "This account was removed by admin. We sent a fresh verification link. Verify it, then log in again."
    );
  };

  // ---------- EMAIL + PASSWORD ----------

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      if (!emailName.trim()) throw new Error("missing-name");
      if (!/\S+@\S+\.\S+/.test(email)) throw new Error("invalid-email");
      if (emailPassword.length < 6) throw new Error("weak-password");

      const result = await createUserWithEmailAndPassword(auth, email, emailPassword);
      await sendEmailVerification(result.user);
      await createUserProfileIfNeeded(result.user.uid, {
        name: emailName.trim(),
        email,
        referredByCode: emailReferralCode.trim() || referralCodeFromLink,
      });

      setSuccessMessage(
        `Verification link sent to ${email}. Please check your inbox — ` +
          `if you don't see it within a minute, check your Spam/Junk folder ` +
          `(this happens sometimes since the email comes from Firebase). ` +
          `Click the link, then come back and log in below.`
      );
      setEmailMode("login");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        const removedUser = await getRemovedUserByEmail(email);
        if (removedUser) {
          setError(
            "This account was removed by admin. Log in with the same email and password to receive a fresh verification link."
          );
        } else {
          setError("This email is already registered. Please log in instead.");
        }
        setEmailMode("login");
      } else if (err.message === "weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (err.message === "invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.message === "missing-name") {
        setError("Please enter your name.");
      } else {
        setError("Could not create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, emailPassword);

      // Firebase's cached user object can have a stale emailVerified value
      // right after sign-in — even if the user already clicked the
      // verification link in another tab. Reload from the server so we
      // check the real, current status instead of a stale cached one.
      await result.user.reload();

      const userRecord = await getUserRecord(result.user.uid);

      if (userRecord?.account_status === "removed") {
        if (userRecord.reactivation_required && result.user.emailVerified) {
          await restoreRemovedUserProfile(result.user.uid);
          navigate(await getPostLoginPath(result.user.email));
          return;
        }

        await sendEmailVerification(result.user);
        await handleRemovedAccount();
        return;
      }

      if (!result.user.emailVerified) {
        // They haven't clicked the verification link yet — resend it and
        // block login until they do.
        await sendEmailVerification(result.user);
        setError(
          "Please verify your email first. We've sent another verification " +
            "link — check your inbox and Spam/Junk folder."
        );
        setLoading(false);
        return;
      }

      await createUserProfileIfNeeded(result.user.uid, { email });
      navigate(await getPostLoginPath(result.user.email));
    } catch (err) {
      console.error(err);
      if (err.message === "account-removed") {
        await handleRemovedAccount();
        return;
      }
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email. Please sign up first.");
        setEmailMode("signup");
      } else {
        setError("Could not log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      // Deliberately the same message whether or not the account exists —
      // this stops someone from using this form to check which emails are
      // registered on the platform.
      setSuccessMessage(
        `If an account exists for ${email}, a password reset link has been sent. ` +
          `Check your inbox and Spam/Junk folder.`
      );
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Could not send reset link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- PHONE + PASSWORD ----------

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  };

  const getFullPhoneNumber = () => {
    const cleanedPhone = phone.replace(/[^0-9]/g, "");
    return `${countryCode}${cleanedPhone}`;
  };

  // Step 1 for a NEW phone user: they enter phone + a password they want to
  // use going forward, then we send an OTP to prove they own the number.
  const handlePhoneSignupStart = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      if (!phoneName.trim()) throw new Error("missing-name");
      if (phonePassword.length < 6) throw new Error("weak-password");

      const fullPhoneNumber = getFullPhoneNumber();
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);
      setPendingPhonePassword(phonePassword);
      setPhoneStep("otp");
      setSuccessMessage(`OTP sent to ${fullPhoneNumber}`);
    } catch (err) {
      console.error(err);
      if (err.message === "weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (err.message === "missing-name") {
        setError("Please enter your name.");
      } else if (err.code === "auth/billing-not-enabled") {
        setError(
          "Phone OTP login isn't available right now (project needs the Blaze billing plan enabled in Firebase). Please use Email login instead for now."
        );
      } else {
        setError("Could not send OTP. Please check the phone number and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify the OTP. Firebase signs them in with a phone-auth
  // account. We then ATTACH an email/password credential (using the fake
  // phone-based email) to that same account, so next time they can skip
  // the OTP entirely and just use phone + password.
  const handlePhoneVerifyOtp = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const fullPhoneNumber = getFullPhoneNumber();
      const fakeEmail = phoneToFakeEmail(fullPhoneNumber);

      const credential = EmailAuthProvider.credential(fakeEmail, pendingPhonePassword);
      try {
        await linkWithCredential(result.user, credential);
      } catch (linkErr) {
        // If a password credential is already linked (e.g. user re-verifying
        // after a partial signup), ignore the "already linked" case.
        if (linkErr.code !== "auth/provider-already-linked") throw linkErr;
      }

      const userRecord = await getUserRecord(result.user.uid);
      if (userRecord?.account_status === "removed") {
        await handleRemovedAccount();
        return;
      }

      await createUserProfileIfNeeded(result.user.uid, {
        name: phoneName,
        phone: fullPhoneNumber,
        referredByCode: phoneReferralCode.trim() || referralCodeFromLink,
      });
      navigate(await getPostLoginPath(result.user.email));
    } catch (err) {
      console.error(err);
      if (err.message === "account-removed") {
        await handleRemovedAccount();
        return;
      }
      setError("Incorrect OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Returning phone user: phone + password, no OTP needed. Under the hood
  // this signs in with the fake phone-based email we created during signup.
  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const fullPhoneNumber = getFullPhoneNumber();
      const fakeEmail = phoneToFakeEmail(fullPhoneNumber);
      const result = await signInWithEmailAndPassword(auth, fakeEmail, phonePassword);
      const userRecord = await getUserRecord(result.user.uid);
      if (userRecord?.account_status === "removed") {
        await handleRemovedAccount();
        return;
      }
      await createUserProfileIfNeeded(result.user.uid, { phone: fullPhoneNumber });
      navigate(await getPostLoginPath(result.user.email));
    } catch (err) {
      console.error(err);
      if (err.message === "account-removed") {
        await handleRemovedAccount();
        return;
      }
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Incorrect phone number or password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this phone number. Please sign up first.");
        setPhoneStep("enter");
      } else {
        setError("Could not log in. Please try again.");
      }
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

        {referralCodeFromLink && (
          <div className="login-referral-banner">
            <Link2 size={15} strokeWidth={2.2} />
            <span>Referral code applied: {referralCodeFromLink}</span>
          </div>
        )}

        <div className="login-method-toggle">
          <button
            type="button"
            className={loginMethod === "phone" ? "active" : ""}
            onClick={() => {
              setLoginMethod("phone");
              setPhoneStep("enter");
              resetMessages();
            }}
          >
            Phone
          </button>
          <button
            type="button"
            className={loginMethod === "email" ? "active" : ""}
            onClick={() => {
              setLoginMethod("email");
              setEmailMode("login");
              resetMessages();
            }}
          >
            Email
          </button>
        </div>

        {/* ---------- PHONE FLOW ---------- */}

        {loginMethod === "phone" && phoneStep === "enter" && (
          <form onSubmit={handlePhoneSignupStart} className="login-form">
            <label className="login-label">Your Name</label>
            <input
              type="text"
              placeholder="e.g. Antor Biswas"
              value={phoneName}
              onChange={(e) => setPhoneName(e.target.value)}
              required
              className="login-input"
            />

            <label className="login-label">Phone Number</label>
            <div className="login-phone-row">
              <select
                className="login-country-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                placeholder={countryConfig.example}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                maxLength={countryConfig.digits}
                required
                className="login-input"
              />
            </div>

            <label className="login-label">Password</label>
            <input
              type="password"
              placeholder="Create a password (min. 6 characters)"
              value={phonePassword}
              onChange={(e) => setPhonePassword(e.target.value)}
              required
              minLength={6}
              className="login-input"
            />

            <label className="login-label">Referral Code (optional)</label>
            <input
              type="text"
              placeholder="Enter referral code"
              value={phoneReferralCode}
              onChange={(e) => setPhoneReferralCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              className="login-input"
            />

            <Button
              type="submit"
              icon={ArrowRight}
              iconPosition="right"
              loading={loading}
              className="login-submit"
            >
              Send OTP
            </Button>

            <p className="login-switch">
              Already verified before?{" "}
              <button type="button" className="login-link" onClick={() => setPhoneStep("login")}>
                Log in with password
              </button>
            </p>
          </form>
        )}

        {loginMethod === "phone" && phoneStep === "otp" && (
          <form onSubmit={handlePhoneVerifyOtp} className="login-form">
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
              Verify &amp; Continue
            </Button>
          </form>
        )}

        {loginMethod === "phone" && phoneStep === "login" && (
          <form onSubmit={handlePhoneLogin} className="login-form">
            <label className="login-label">Phone Number</label>
            <div className="login-phone-row">
              <select
                className="login-country-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                placeholder={countryConfig.example}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                maxLength={countryConfig.digits}
                required
                className="login-input"
              />
            </div>

            <label className="login-label">Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={phonePassword}
              onChange={(e) => setPhonePassword(e.target.value)}
              required
              className="login-input"
            />

            <Button
              type="submit"
              icon={ArrowRight}
              iconPosition="right"
              loading={loading}
              className="login-submit"
            >
              Log In
            </Button>

            <p className="login-switch">
              New here?{" "}
              <button type="button" className="login-link" onClick={() => setPhoneStep("enter")}>
                Sign up with OTP
              </button>
            </p>
          </form>
        )}

        {/* ---------- EMAIL FLOW ---------- */}

        {loginMethod === "email" && emailMode !== "reset" && (
          <form
            onSubmit={emailMode === "signup" ? handleEmailSignup : handleEmailLogin}
            className="login-form"
          >
            {emailMode === "signup" && (
              <>
                <label className="login-label">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Antor Biswas"
                  value={emailName}
                  onChange={(e) => setEmailName(e.target.value)}
                  required
                  className="login-input"
                />
              </>
            )}

            <label className="login-label">Email Address</label>
            <div className="login-email-row">
              <Mail size={18} strokeWidth={2} className="login-email-icon" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input login-input-email"
              />
            </div>

              {emailMode === "signup" && (
                <>
                  <label className="login-label">Referral Code (optional)</label>
                  <input
                    type="text"
                    placeholder="Enter referral code"
                    value={emailReferralCode}
                    onChange={(e) => setEmailReferralCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    className="login-input"
                  />
                </>
              )}

            <label className="login-label">Password</label>
            <input
              type="password"
              placeholder={emailMode === "signup" ? "Create a password (min. 6 characters)" : "Your password"}
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              required
              minLength={6}
              className="login-input"
            />

            {emailMode === "login" && (
              <p className="login-forgot">
                <button
                  type="button"
                  className="login-link"
                  onClick={() => {
                    resetMessages();
                    setEmailMode("reset");
                  }}
                >
                  Forgot password?
                </button>
              </p>
            )}

            <Button
              type="submit"
              icon={ArrowRight}
              iconPosition="right"
              loading={loading}
              className="login-submit"
            >
              {emailMode === "signup" ? "Sign Up" : "Log In"}
            </Button>

            <p className="login-switch">
              {emailMode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button type="button" className="login-link" onClick={() => setEmailMode("login")}>
                    Log in
                  </button>
                </>
              ) : (
                <>
                  New here?{" "}
                  <button type="button" className="login-link" onClick={() => setEmailMode("signup")}>
                    Sign up
                  </button>
                </>
              )}
            </p>
          </form>
        )}

        {loginMethod === "email" && emailMode === "reset" && (
          <form onSubmit={handleForgotPassword} className="login-form">
            <label className="login-label">Email Address</label>
            <div className="login-email-row">
              <Mail size={18} strokeWidth={2} className="login-email-icon" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input login-input-email"
              />
            </div>

            <Button
              type="submit"
              icon={ArrowRight}
              iconPosition="right"
              loading={loading}
              className="login-submit"
            >
              Send Reset Link
            </Button>

            <p className="login-switch">
              <button
                type="button"
                className="login-link"
                onClick={() => {
                  resetMessages();
                  setEmailMode("login");
                }}
              >
                Back to log in
              </button>
            </p>
          </form>
        )}

        {error && <p className="login-error">{error}</p>}
        {successMessage && <p className="login-success">{successMessage}</p>}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default Login;