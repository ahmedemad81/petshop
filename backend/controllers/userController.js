import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import { sendMfaCodeEmail } from "../utils/mailer.js";
import {
  generate6DigitCode,
  hashCode,
  verifyCode,
  signMfaToken,
  verifyMfaToken,
} from "../utils/mfa.js";

// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

// If MFA disabled for this user, behave like before
  if (!user.mfa?.mfaEnabled) {
    generateToken(res, user._id);
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      shippingAddress: user.shippingAddress,
    });
  }

  // Generate and store OTP hash
  const code = generate6DigitCode();
  const codeHash = await hashCode(code);

  user.mfa.mfaOtpHash = codeHash;
  user.mfa.mfaOtpExpiresAt = new Date(Date.now() + process.env.MFA_OTP_TTL_MIN * 60 * 1000);
  user.mfa.mfaOtpAttempts = 0;
  user.mfa.mfaOtpLastSentAt = new Date();
  await user.save();

  // Send code (email)
  await sendMfaCodeEmail({ to: user.email, code });

  // Return MFA token (NOT the main auth cookie)
  const mfaToken = signMfaToken(user._id);

  res.json({ mfaRequired: true, mfaToken });
});

// POST /api/users/auth/mfa
const verifyMfaUser = asyncHandler(async (req, res) => {
  const { mfaToken, code } = req.body;

  if (!mfaToken || !code) {
    res.status(400);
    throw new Error("mfaToken and code are required");
  }

  let decoded;
  try {
    decoded = verifyMfaToken(mfaToken);
  } catch {
    res.status(401);
    throw new Error("Invalid or expired MFA token");
  }

  if (decoded.purpose !== "mfa") {
    res.status(401);
    throw new Error("Invalid MFA token");
  }

  const user = await User.findById(decoded.userId);

  if (!user || !user.mfa?.mfaEnabled) {
    res.status(401);
    throw new Error("MFA not available");
  }

  if (!user.mfa.mfaOtpHash || !user.mfa.mfaOtpExpiresAt) {
    res.status(401);
    throw new Error("No active code. Please login again.");
  }

  if (user.mfa.mfaOtpExpiresAt.getTime() < Date.now()) {
    res.status(401);
    throw new Error("Code expired. Please login again.");
  }

  if (user.mfa.mfaOtpAttempts >= process.env.MFA_OTP_MAX_ATTEMPTS) {
    res.status(429);
    throw new Error("Too many attempts. Please login again.");
  }

  const ok = await verifyCode(code, user.mfa.mfaOtpHash);

  user.mfa.mfaOtpAttempts += 1;

  if (!ok) {
    await user.save();
    res.status(401);
    throw new Error("Invalid code");
  }

  // Success: clear OTP fields
  user.mfa.mfaOtpHash = undefined;
  user.mfa.mfaOtpExpiresAt = undefined;
  user.mfa.mfaOtpAttempts = 0;
  await user.save();

  // NOW set the normal auth cookie
  generateToken(res, user._id);

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    shippingAddress: user.shippingAddress,
  });
});

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
const logoutUser = (req, res) => {
  res.clearCookie("jwt");
  res.status(200).send("Logged out successfully");
};

// @desc    Register user & get token
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.status(200).json(users);
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    user.shippingAddress = req.body.shippingAddress;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      shippingAddress: updatedUser.shippingAddress,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user profile password
// @route   PUT /api/users/password
// @access  Private
const updateUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    if (await user.matchPassword(req.body.currentPassword)) {
      user.password = req.body.password;

      await user.save();
      res.json({ message: "Password updated" });
    } else {
      res.status(401);
      throw new Error("Invalid password");
    }
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.isAdmin) {
      res.status(400);
      throw new Error("Can not delete admin user");
    }
    await User.deleteOne({ _id: user._id });
    res.json({ message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export {
  authUser,
  verifyMfaUser,
  logoutUser,
  registerUser,
  getUsers,
  updateUserProfile,
  updateUserPassword,
  deleteUser,
  getUserById,
};
