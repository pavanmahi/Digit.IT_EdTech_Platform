const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  dueDate: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);