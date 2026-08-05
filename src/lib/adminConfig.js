/**
 * Only these emails are allowed into /admin. For now it's just the one
 * account. Later, more admins can be added straight from the Admin panel's
 * Settings page (not built yet) — that feature should end up writing to
 * an "admins" collection in Firestore instead of this hardcoded list, so
 * new admins can be added without a code deploy. This list is the fallback
 * / bootstrap admin until that exists.
 */
export const ADMIN_EMAILS = ["altcafe2026@gmail.com"];

export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
