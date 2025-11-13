const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // When a teacher creates a task for their class, we clone tasks for each student.
  // Those student tasks reference the teacher's original task via sourceTaskId.
  sourceTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  dueDate: { type: Date, default: null },
  progress: { type: String, enum: ['not-started', 'in-progress', 'completed'], default: 'not-started' }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);