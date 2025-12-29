import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashCode(code) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(code, salt);
}

export async function verifyCode(code, hash) {
  return bcrypt.compare(code, hash);
}

// short-lived token used ONLY for MFA step
export function signMfaToken(userId) {
  return jwt.sign(
    { userId, purpose: "mfa" },
    process.env.MFA_JWT_SECRET || process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

export function verifyMfaToken(token) {
  return jwt.verify(token, process.env.MFA_JWT_SECRET || process.env.JWT_SECRET);
}
