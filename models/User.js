// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },

  otp: String,
  otpExpires: Date,

  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },

  totpSecret: { type: String, default: null },
  is2FAEnabled: { type: Boolean, default: false },

  refreshToken: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },

  isVerified: {
    type: Boolean,
    default: false,
  },
});

// hash password
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function (raw) {
  return bcrypt.compare(raw, this.password);
};

module.exports = mongoose.model("User", UserSchema);
