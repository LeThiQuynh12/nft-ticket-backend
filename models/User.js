// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user','admin'], default: 'user' },

  // lockout / brute-force protection
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },

  // OTP / 2FA (if using TOTP)
  totpSecret: { type: String, default: null },
  is2FAEnabled: { type: Boolean, default: false },

  // metadata
  createdAt: { type: Date, default: Date.now }
});

// hash password before save
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Reset login attempts sau khi login thành công
UserSchema.methods.resetLoginAttempts = function() {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
};

// Tăng số lần đăng nhập sai
UserSchema.methods.incrementLoginAttempts = function() {
  this.failedLoginAttempts += 1;
  // Nếu vượt quá 5 lần => khóa trong 15 phút
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  return this.save();
};

module.exports = mongoose.model('User', UserSchema);
