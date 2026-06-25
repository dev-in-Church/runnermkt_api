const express = require("express");
const {
  verify,
  resendVerification,
} = require("../controllers/verificationController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Verify email with token (public endpoint)
router.post("/verify-email", verify);

// Resend verification email (requires authentication)
router.post("/resend-verification", authenticate, resendVerification);

module.exports = router;
