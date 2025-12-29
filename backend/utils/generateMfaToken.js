import jwt from "jsonwebtoken";

const generateMfaToken = (userId) => {
  return jwt.sign(
    { userId, purpose: "mfa" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
};

export default generateMfaToken;
