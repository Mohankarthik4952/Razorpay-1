const Razorpay = require("razorpay");

// ============================================================
// RAZORPAY CONFIGURATION
// ============================================================

const keyId = process.env.RAZORPAY_KEY_ID;

const keySecret = process.env.RAZORPAY_KEY_SECRET;

// ============================================================
// VALIDATION
// ============================================================

if (!keyId) {
  console.warn("WARNING: RAZORPAY_KEY_ID is missing.");
}

if (!keySecret) {
  console.warn("WARNING: RAZORPAY_KEY_SECRET is missing.");
}

// ============================================================
// RAZORPAY INSTANCE
// ============================================================

const razorpay =
  keyId && keySecret
    ? new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      })
    : null;

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  razorpay,
  keyId,
  keySecret,
};
