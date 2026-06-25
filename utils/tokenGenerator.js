const crypto = require("crypto");

// Generate a secure random verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Generate verification link
const generateVerificationLink = (token) => {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${baseUrl}/auth/verify-email?token=${token}`;
};

// Token expiration time (24 hours)
const TOKEN_EXPIRATION_HOURS = 24;

const getTokenExpirationDate = () => {
  const now = new Date();
  now.setHours(now.getHours() + TOKEN_EXPIRATION_HOURS);
  return now;
};

module.exports = {
  generateVerificationToken,
  generateVerificationLink,
  getTokenExpirationDate,
  TOKEN_EXPIRATION_HOURS,
};
