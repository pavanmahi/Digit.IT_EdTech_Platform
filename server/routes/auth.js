const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.body && req.body.email ? `login:${req.body.email}` : req.ip),
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts, please try again later' }
});

router.post('/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['student', 'teacher']),
    body('inviteCode').optional().isString().trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid input: ' + errors.array().map(e => e.msg).join(', ') });
      }

      const { email, password, role, inviteCode } = req.body;

      const passwordHash = await bcrypt.hash(password, 10);

      if (role === 'teacher') {
        // Generate unique invite code
        let code;
        let collision = true;
        for (let i = 0; i < 5 && collision; i++) {
          code = crypto.randomBytes(5).toString('hex'); // 10-char hex code
          const existing = await User.findOne({ inviteCode: code }).select('_id');
          collision = !!existing;
        }

        const newUser = await User.create({ email, passwordHash, role, inviteCode: code });
        return res.status(201).json({
          success: true,
          message: 'Teacher created successfully',
          user: { id: newUser._id, email: newUser.email, role: newUser.role },
          inviteCode: newUser.inviteCode
        });
      }

      // Student signup requires a valid teacher invite code
      if (!inviteCode) {
        return res.status(400).json({ success: false, message: 'Invite code required for student signup' });
      }

      const teacher = await User.findOne({ inviteCode }).select('_id role');
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({ success: false, message: 'Invalid invite code' });
      }

      const newStudent = await User.create({ email, passwordHash, role, assignedTeacher: teacher._id });
      return res.status(201).json({
        success: true,
        message: 'Student created successfully',
        user: { id: newStudent._id, email: newStudent.email, role: newStudent.role, assignedTeacher: teacher._id }
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

      const user = await User.findOne({ email }).select('_id email passwordHash role assignedTeacher');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role, assignedTeacher: user.assignedTeacher ? user.assignedTeacher.toString() : null },
        process.env.SESSION_SECRET,
        { expiresIn: '24h' }
      );

      const key = req.body && req.body.email ? `login:${req.body.email}` : req.ip;
      if (typeof loginLimiter.resetKey === 'function') {
        loginLimiter.resetKey(key);
      }

      let teacherEmail = null;
      let teacherName = null;
      if (user.assignedTeacher) {
        const teacher = await User.findById(user.assignedTeacher).select('email name');
        if (teacher) {
          teacherEmail = teacher.email;
          teacherName = teacher.name || null;
        }
      }

      res.json({
        success: true,
        token,
        user: { id: user._id, email: user.email, role: user.role, assignedTeacher: user.assignedTeacher, assignedTeacherEmail: teacherEmail, assignedTeacherName: teacherName }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('_id email name role assignedTeacher');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    let teacherEmail = null;
    let teacherName = null;
    if (user.assignedTeacher) {
      const teacher = await User.findById(user.assignedTeacher).select('email name');
      if (teacher) {
        teacherEmail = teacher.email;
        teacherName = teacher.name || null;
      }
    }
    res.json({ success: true, user: { id: user._id, email: user.email, name: user.name || '', role: user.role, assignedTeacher: user.assignedTeacher, assignedTeacherEmail: teacherEmail, assignedTeacherName: teacherName } });
  } catch (error) {
    next(error);
  }
});

router.put('/me',
  authenticateToken,
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().isString().trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid input: ' + errors.array().map(e => e.msg).join(', ') });
      }
      const updates = {};
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.name !== undefined) updates.name = req.body.name;
      const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('_id email name role assignedTeacher');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role, assignedTeacher: user.assignedTeacher ? user.assignedTeacher.toString() : null },
        process.env.SESSION_SECRET,
        { expiresIn: '24h' }
      );
      let teacherEmail = null;
      let teacherName = null;
      if (user.assignedTeacher) {
        const teacher = await User.findById(user.assignedTeacher).select('email name');
        if (teacher) {
          teacherEmail = teacher.email;
          teacherName = teacher.name || null;
        }
      }
      res.json({ success: true, message: 'Profile updated', token, user: { id: user._id, email: user.email, name: user.name || '', role: user.role, assignedTeacher: user.assignedTeacher, assignedTeacherEmail: teacherEmail, assignedTeacherName: teacherName } });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid input: ' + errors.array().map(e => e.msg).join(', ') });
      }
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id).select('_id passwordHash');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      const newHash = await bcrypt.hash(newPassword, 10);
      user.passwordHash = newHash;
      await user.save();
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/teachers', async (req, res, next) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('_id email name').sort({ email: 1 });
    res.json({ success: true, teachers: teachers.map(t => ({ id: t._id, email: t.email, name: t.name })) });
  } catch (error) {
    next(error);
  }
});

// Invite code endpoints for teachers
router.get('/invite-code', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can view invite codes' });
    }
    const teacher = await User.findById(req.user.id).select('inviteCode');
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!teacher.inviteCode) {
      // Generate if missing
      let code;
      let collision = true;
      for (let i = 0; i < 5 && collision; i++) {
        code = crypto.randomBytes(5).toString('hex');
        const existing = await User.findOne({ inviteCode: code }).select('_id');
        collision = !!existing;
      }
      teacher.inviteCode = code;
      await teacher.save();
    }
    res.json({ success: true, inviteCode: teacher.inviteCode });
  } catch (error) {
    next(error);
  }
});

router.post('/invite-code/rotate', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can rotate invite codes' });
    }
    const teacher = await User.findById(req.user.id).select('inviteCode');
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    let code;
    let collision = true;
    for (let i = 0; i < 5 && collision; i++) {
      code = crypto.randomBytes(5).toString('hex');
      const existing = await User.findOne({ inviteCode: code }).select('_id');
      collision = !!existing;
    }
    teacher.inviteCode = code;
    await teacher.save();
    res.json({ success: true, inviteCode: teacher.inviteCode });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
