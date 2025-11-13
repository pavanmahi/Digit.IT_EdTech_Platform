const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ['student', 'teacher'] },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  inviteCode: { type: String }
}, { timestamps: true });

// Unique index for inviteCode only when present (teachers)
UserSchema.index({ inviteCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', UserSchema);