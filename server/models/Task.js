const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  dueDate: { type: Date, default: null },
  progress: { type: String, enum: ['not-started', 'in-progress', 'completed'], default: 'not-started' }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);