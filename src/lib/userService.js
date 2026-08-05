// This file holds all the Firestore logic related to users and referrals.
// Keeping it in one place means every page (Login, Dashboard, Booking, etc.)
// can import the same functions instead of each writing its own Firestore code.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

const MAX_WALLET_REWARD = 500; // ₹500 cap per user, from the business rules
const REFERRAL_REWARD = 30; // ₹30 credited to the referrer
const NEW_USER_DISCOUNT = 30; // ₹30 discount for the person who was referred

/**
 * Turns a name into a referral code like "AKRAM123".
 * Not guaranteed unique on its own — checkReferralCodeUnique() below
 * handles that by adding random digits if there's a clash.
 */
function generateReferralCode(name) {
  const base = (name || "USER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "USER";
  const randomDigits = Math.floor(100 + Math.random() * 900); // 3-digit number
  return `${base}${randomDigits}`;
}

/**
 * Generates a referral code and keeps retrying with new random digits
 * until it finds one that isn't already used in the users collection.
 */
async function generateUniqueReferralCode(name) {
  let code = generateReferralCode(name);
  let attempts = 0;

  while (attempts < 5) {
    const existing = await getDocs(
      query(collection(db, "users"), where("referral_code", "==", code))
    );
    if (existing.empty) return code; // no one else has this code, safe to use
    code = generateReferralCode(name); // clash — try again with new digits
    attempts++;
  }

  // Extremely unlikely fallback: attach a timestamp to guarantee uniqueness.
  return `${code}${Date.now().toString().slice(-4)}`;
}

/**
 * Looks up which user owns a given referral code.
 * Returns the user's Firestore document id (uid), or null if not found.
 */
async function findUserByReferralCode(referralCode) {
  if (!referralCode) return null;
  const snap = await getDocs(
    query(collection(db, "users"), where("referral_code", "==", referralCode.toUpperCase()))
  );
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/**
 * Call this right after a user signs up (phone OTP verified, or email link
 * completed) to create their Firestore profile. Safe to call even if the
 * profile already exists — it won't overwrite an existing user.
 *
 * @param {string} uid - Firebase Auth uid (same as auth.currentUser.uid)
 * @param {object} details - { name, phone, email, referredByCode }
 */
export async function createUserProfileIfNeeded(uid, details = {}) {
  const userRef = doc(db, "users", uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    return existing.data(); // already signed up before, don't recreate
  }

  const { name = "", phone = "", email = "", referredByCode = "" } = details;

  const referralCode = await generateUniqueReferralCode(name || phone || email);
  const referredByUid = await findUserByReferralCode(referredByCode);
  let referralRewarded = false;

  if (referredByUid) {
    const referrerRef = doc(db, "users", referredByUid);
    const referrerSnap = await getDoc(referrerRef);

    if (referrerSnap.exists()) {
      const referrer = referrerSnap.data();
      const currentBalance = referrer.wallet_balance || 0;
      const roomLeft = MAX_WALLET_REWARD - currentBalance;
      const rewardToGive = Math.max(0, Math.min(REFERRAL_REWARD, roomLeft));

      if (rewardToGive > 0) {
        await updateDoc(referrerRef, {
          wallet_balance: increment(rewardToGive),
          referral_count: increment(1),
        });
        await addWalletTransaction(referredByUid, {
          label: `Referral bonus — ${name || phone || email || "a friend"} joined`,
          amount: rewardToGive,
        });
      }

      referralRewarded = true;
    }
  }

  const newUser = {
    name,
    phone,
    email,
    referral_code: referralCode,
    referred_by: referredByUid || null,
    wallet_balance: 0,
    referral_count: 0,
    referral_rewarded: referralRewarded,
    // If they signed up with a valid referral code, they get ₹30 off their
    // first order. This flag is checked and cleared when they book/order.
    pending_signup_discount: referredByUid ? NEW_USER_DISCOUNT : 0,
    created_at: new Date().toISOString(),
  };

  await setDoc(userRef, newUser);

  return newUser;
}

/**
 * Fetches a user's Firestore profile by their Auth uid.
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Updates a user's own editable profile fields (from the Profile page's
 * edit form). Only ever touches name/email/phone — never balances or
 * referral fields, those are only ever changed by server-trusted logic.
 */
export async function updateUserProfile(uid, updates = {}) {
  const allowed = {};
  if (typeof updates.name === "string") allowed.name = updates.name.trim();
  if (typeof updates.email === "string") allowed.email = updates.email.trim();
  await updateDoc(doc(db, "users", uid), allowed);
}

/**
 * Records one row in a user's wallet transaction history (referral bonus,
 * withdrawal, order paid with wallet credit, etc). Positive amount = money
 * added, negative = money spent/withdrawn.
 */
export async function addWalletTransaction(uid, { label, amount }) {
  await addDoc(collection(db, "users", uid, "wallet_transactions"), {
    label,
    amount,
    created_at: new Date().toISOString(),
  });
}

/**
 * Fetches a user's wallet transaction history, most recent first.
 */
export async function getWalletTransactions(uid) {
  const snap = await getDocs(
    query(collection(db, "users", uid, "wallet_transactions"), orderBy("created_at", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Call this when a referred user completes their FIRST booking/purchase.
 * It credits the referrer's wallet (respecting the ₹500 cap) and increments
 * their referral_count. Call once per user — check a flag before calling
 * again so the same referral isn't rewarded twice.
 */
export async function applyReferralRewardOnFirstPurchase(newUserUid) {
  const newUserSnap = await getDoc(doc(db, "users", newUserUid));
  if (!newUserSnap.exists()) return;

  const newUser = newUserSnap.data();
  if (!newUser.referred_by || newUser.first_purchase_rewarded || newUser.referral_rewarded) {
    return; // no referrer, or already rewarded — nothing to do
  }

  const referrerRef = doc(db, "users", newUser.referred_by);
  const referrerSnap = await getDoc(referrerRef);
  if (!referrerSnap.exists()) return;

  const referrer = referrerSnap.data();
  const currentBalance = referrer.wallet_balance || 0;
  const roomLeft = MAX_WALLET_REWARD - currentBalance;
  const rewardToGive = Math.max(0, Math.min(REFERRAL_REWARD, roomLeft));

  if (rewardToGive > 0) {
    await updateDoc(referrerRef, {
      wallet_balance: increment(rewardToGive),
      referral_count: increment(1),
    });
    await addWalletTransaction(newUser.referred_by, {
      label: `Referral bonus — ${newUser.name || newUser.phone || newUser.email || "a friend"} joined`,
      amount: rewardToGive,
    });
  }

  // Mark this user as rewarded so the referrer can't be paid twice for them.
  await updateDoc(doc(db, "users", newUserUid), {
    first_purchase_rewarded: true,
  });
}

/**
 * Fetches every user profile — used by the Admin panel's user list.
 * Only meant to be called by an admin-gated page (Firestore rules should
 * also restrict the "users" collection's list access to admins).
 */
export async function getAllUsers() {
  const snap = await getDocs(query(collection(db, "users"), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetches every wallet transaction across every user (via a Firestore
 * collectionGroup query on "wallet_transactions") — used by the Admin
 * panel's Wallet page to show a platform-wide ledger.
 */
export async function getAllWalletTransactions() {
  const snap = await getDocs(
    query(collectionGroup(db, "wallet_transactions"), orderBy("created_at", "desc"))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    uid: d.ref.parent.parent.id,
    ...d.data(),
  }));
}

export { NEW_USER_DISCOUNT, REFERRAL_REWARD, MAX_WALLET_REWARD };
