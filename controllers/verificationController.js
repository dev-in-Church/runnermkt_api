const { query, getClient } = require("../config/database");
const { sendVerificationEmail } = require("../services/emailService");
const {
  generateVerificationToken,
  generateVerificationLink,
  getTokenExpirationDate,
} = require("../utils/tokenGenerator");

// Verify email with token
const verify = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required." });
    }

    console.log("[v0] Verifying email token");

    // Find token and check if it's valid and not expired
    const tokenRes = await query(
      `SELECT evt.id, evt.user_id, evt.expires_at, u.email, u.email_verified
       FROM email_verification_tokens evt
       JOIN users u ON evt.user_id = u.id
       WHERE evt.token = $1`,
      [token],
    );

    if (tokenRes.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token." });
    }

    const tokenRecord = tokenRes.rows[0];

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: "Verification token has expired." });
    }

    // Check if already verified
    if (tokenRecord.email_verified) {
      return res.status(400).json({ error: "Email is already verified." });
    }

    // Mark email as verified
    await query("UPDATE users SET email_verified = true WHERE id = $1", [
      tokenRecord.user_id,
    ]);

    // Delete the used token
    await query("DELETE FROM email_verification_tokens WHERE id = $1", [
      tokenRecord.id,
    ]);

    console.log("[v0] Email verified for user:", tokenRecord.user_id);

    res.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    console.error("[v0] Email verification error:", err.message);
    res.status(500).json({ error: "Email verification failed." });
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("[v0] Resending verification email for user:", userId);

    // Get user details
    const userRes = await query(
      "SELECT id, email, first_name, email_verified FROM users WHERE id = $1",
      [userId],
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = userRes.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: "Email is already verified." });
    }

    // Delete old tokens for this user
    await query("DELETE FROM email_verification_tokens WHERE user_id = $1", [
      userId,
    ]);

    // Generate new token
    const newToken = generateVerificationToken();
    const expiresAt = getTokenExpirationDate();

    // Save token to database
    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, newToken, expiresAt],
    );

    // Send verification email
    const verificationLink = generateVerificationLink(newToken);
    sendVerificationEmail({
      email: user.email,
      userName: user.first_name,
      verificationLink,
    }).catch((err) => console.error("[v0] Email send error:", err));

    console.log("[v0] Verification email resent to:", user.email);

    res.json({
      success: true,
      message: "Verification email sent. Check your inbox.",
    });
  } catch (err) {
    console.error("[v0] Resend verification error:", err.message);
    res.status(500).json({ error: "Failed to resend verification email." });
  }
};

module.exports = {
  verify,
  resendVerification,
};
