const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const Progress = require('../models/Progress');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;

    if (role === 'student') {
      const progressDocs = await Progress.find({ studentId: userId })
        .populate('taskId')
        .sort({ updatedAt: -1 });
      const tasks = progressDocs.map(p => {
        const task = p.taskId;
        if (!task) return null;
        const obj = task.toObject();
        return { ...obj, progress: p.progress, progressId: p._id };
      }).filter(Boolean);
      return res.json({ success: true, tasks });
    }

    if (role === 'teacher') {
      const tasks = await Task.find({ teacherId: userId }).sort({ createdAt: -1 });
      const taskIds = tasks.map(t => t._id);
      let map = {};
      if (taskIds.length) {
        const statuses = await Progress.find({ taskId: { $in: taskIds } })
          .populate('studentId', 'email')
          .select('studentId progress taskId');
        map = statuses.reduce((acc, s) => {
          const key = String(s.taskId);
          if (!acc[key]) acc[key] = [];
          acc[key].push({ studentId: s.studentId._id, email: s.studentId.email, progress: s.progress });
          return acc;
        }, {});
      }
      const enriched = tasks.map(t => ({ ...t.toObject(), assignees: map[String(t._id)] || [] }));
      return res.json({ success: true, tasks: enriched });
    }

    res.json({ success: true, tasks: [] });
  } catch (error) {
    next(error);
  }
});

router.post('/',
  [
    body('title').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('dueDate').optional().isISO8601()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid input: ' + errors.array().map(e => e.msg).join(', ') });
      }

      const { title, description, dueDate } = req.body;
      const teacherId = req.user.id;
      const role = req.user.role;

      if (role !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Only teachers can create tasks' });
      }

      const teacherTask = await Task.create({
        teacherId,
        title,
        description,
        dueDate: dueDate || null
      });

      const students = await User.find({ assignedTeacher: teacherId }).select('_id');
      if (students.length) {
        const progressDocs = students.map(s => ({
          studentId: s._id,
          taskId: teacherTask._id,
          progress: 'Not Started'
        }));
        await Progress.insertMany(progressDocs);
      }

      return res.status(201).json({ success: true, message: 'Task created for class', task: teacherTask, assignedCount: students.length });
    } catch (error) {
      next(error);
    }
  }
);

router.put('/:id',
  [
    param('id').isMongoId(),
    body('title').optional().notEmpty().trim(),
    body('description').optional().notEmpty().trim(),
    body('dueDate').optional().isISO8601(),
    body('progress').optional().isIn(['Not Started', 'In Progress', 'Completed'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid input: ' + errors.array().map(e => e.msg).join(', ') });
      }

      const taskId = req.params.id;
      const userId = req.user.id;
      const role = req.user.role;

      const task = await Task.findById(taskId).select('teacherId');
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      if (role === 'teacher') {
        if (String(task.teacherId) !== String(userId)) {
          return res.status(403).json({ success: false, message: 'Unauthorized: You can only update your own tasks' });
        }
        const { title, description, dueDate } = req.body;
        const updated = await Task.findByIdAndUpdate(
          taskId,
          {
            ...(title !== undefined ? { title } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(dueDate !== undefined ? { dueDate: dueDate || null } : {})
          },
          { new: true }
        );
        return res.json({ success: true, message: 'Task updated successfully', task: updated });
      }

      if (role === 'student') {
        const { progress } = req.body;
        if (progress === undefined) {
          return res.status(400).json({ success: false, message: 'Progress value required' });
        }
        const updated = await Progress.findOneAndUpdate(
          { studentId: userId, taskId },
          { $set: { progress } },
          { new: true }
        );
        if (!updated) {
          return res.status(404).json({ success: false, message: 'Progress record not found' });
        }
        return res.json({ success: true, message: 'Progress updated successfully' });
      }

      res.status(403).json({ success: false, message: 'Unauthorized role' });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id',
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid task ID' });
      }

      const taskId = req.params.id;
      const userId = req.user.id;
      const role = req.user.role;

      const task = await Task.findById(taskId).select('teacherId');
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      if (role !== 'teacher' || String(task.teacherId) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Only the owning teacher can delete this task' });
      }

      await Task.findByIdAndDelete(taskId);
      await Progress.deleteMany({ taskId });

      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
