const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  progress: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' }
}, { timestamps: true });

ProgressSchema.index({ studentId: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);