const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    let tasks;

    if (role === 'student') {
      tasks = await Task.find({ userId }).sort({ createdAt: -1 });
    } else if (role === 'teacher') {
      const students = await User.find({ teacherId: userId }).select('_id');
      const studentIds = students.map(s => s._id);
      tasks = await Task.find({
        $or: [
          { userId },
          { userId: { $in: studentIds } }
        ]
      }).sort({ createdAt: -1 });
    } else {
      tasks = [];
    }

    res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
});

router.post('/',
  [
    body('title').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('dueDate').optional().isISO8601(),
    body('progress').optional().isIn(['not-started', 'in-progress', 'completed'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid input: ' + errors.array().map(e => e.msg).join(', ') });
      }

      const { title, description, dueDate, progress } = req.body;
      const userId = req.user.id;

      const task = await Task.create({
        userId,
        title,
        description,
        dueDate: dueDate || null,
        progress: progress || 'not-started'
      });

      res.status(201).json({ success: true, message: 'Task created successfully', task });
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
    body('progress').optional().isIn(['not-started', 'in-progress', 'completed'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid input: ' + errors.array().map(e => e.msg).join(', ') });
      }

      const taskId = req.params.id;
      const userId = req.user.id;

      const task = await Task.findById(taskId).select('userId');
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      if (task.userId.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only update your own tasks' });
      }

      const { title, description, dueDate, progress } = req.body;
      const updated = await Task.findByIdAndUpdate(
        taskId,
        {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(dueDate !== undefined ? { dueDate: dueDate || null } : {}),
          ...(progress !== undefined ? { progress } : {})
        },
        { new: true }
      );

      res.json({ success: true, message: 'Task updated successfully', task: updated });
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

      const task = await Task.findById(taskId).select('userId');
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      if (task.userId.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only delete your own tasks' });
      }

      await Task.findByIdAndDelete(taskId);

      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
