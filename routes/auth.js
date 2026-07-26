const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { runQuery, getOne, getLastInsertId } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const existing = getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    runQuery('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash]);
    const id = getLastInsertId();

    const token = jwt.sign(
      { id, name, email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: { id, name, email, role: 'user' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = getOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  const user = getOne('SELECT id, name, email, role, blood_group, allergies, disabilities, organ_donor, chronic_diseases, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

router.post('/medical-info', authenticateToken, (req, res) => {
  try {
    const { bloodGroup, allergies, disabilities, organDonor, chronicDiseases } = req.body;
    runQuery('UPDATE users SET blood_group = ?, allergies = ?, disabilities = ?, organ_donor = ?, chronic_diseases = ? WHERE id = ?',
      [bloodGroup || null, allergies || null, disabilities || null, organDonor ? 1 : 0, chronicDiseases || null, req.user.id]);

    const user = getOne('SELECT id, name, email, role, blood_group, allergies, disabilities, organ_donor, chronic_diseases FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Medical information updated successfully!', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update medical information.' });
  }
});

module.exports = router;
