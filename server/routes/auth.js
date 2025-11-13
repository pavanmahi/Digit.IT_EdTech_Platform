const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts, please try again later' }
});

router.post('/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['student', 'teacher']),
    body('teacherId').optional().isMongoId()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid input: ' + errors.array().map(e => e.msg).join(', ')
        });
      }

      const { email, password, role, teacherId } = req.body;

      if (role === 'student' && !teacherId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Students must be assigned to a teacher' 
        });
      }

      if (role === 'student' && teacherId) {
        const teacher = await User.findById(teacherId).select('_id role');
        if (!teacher) {
          return res.status(400).json({ success: false, message: 'Invalid teacher ID' });
        }
        if (teacher.role !== 'teacher') {
          return res.status(400).json({ success: false, message: 'Selected user is not a teacher' });
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        email,
        passwordHash,
        role,
        teacherId: role === 'student' ? teacherId : null
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: { id: newUser._id, email: newUser.email, role: newUser.role }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid email or password format' });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('_id email passwordHash role teacherId');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role, teacherId: user.teacherId ? user.teacherId.toString() : null },
        process.env.SESSION_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: { id: user._id, email: user.email, role: user.role, teacherId: user.teacherId }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/teachers', async (req, res, next) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('_id email').sort({ email: 1 });
    res.json({
      success: true,
      teachers: teachers.map(t => ({ id: t._id, email: t.email }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
