/**
 * ADMIN WHITELIST
 * ───────────────────────────────────────────────────────────────
 * Only Google accounts whose email appears in this list are
 * allowed to access the Admin Dashboard.
 *
 * Add your team members' Google email addresses here.
 * This is the security gate – anyone NOT in this list will be
 * denied access even if they successfully sign in with Google.
 * ───────────────────────────────────────────────────────────────
 */
export const ADMIN_WHITELIST: string[] = [
  // ↓ Add your team Google emails below:
  "vidhan.goel18@gmail.com",           // example placeholder
  // "yourname@gmail.com",        // replace with real team emails
  // "teammate@gmail.com",
];

export const isAdminEmail = (email: string): boolean => {
  return ADMIN_WHITELIST.map((e) => e.toLowerCase()).includes(email.toLowerCase());
};
