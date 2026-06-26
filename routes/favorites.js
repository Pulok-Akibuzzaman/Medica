const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, (req, res) => {
  const favorites = getAll(`
    SELECT d.*, f.created_at as favorited_at
    FROM favorites f
    JOIN doctors d ON f.doctor_id = d.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `, [req.user.id]);
  res.json({ favorites });
});

router.post('/:doctorId', authenticateToken, (req, res) => {
  try {
    const doctor = getOne('SELECT id FROM doctors WHERE id = ?', [parseInt(req.params.doctorId)]);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    runQuery('INSERT OR IGNORE INTO favorites (user_id, doctor_id) VALUES (?, ?)',
      [req.user.id, parseInt(req.params.doctorId)]);

    res.json({ message: 'Doctor added to favorites.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add favorite.' });
  }
});

router.delete('/:doctorId', authenticateToken, (req, res) => {
  runQuery('DELETE FROM favorites WHERE user_id = ? AND doctor_id = ?',
    [req.user.id, parseInt(req.params.doctorId)]);
  res.json({ message: 'Doctor removed from favorites.' });
});

router.get('/check/:doctorId', authenticateToken, (req, res) => {
  const fav = getOne('SELECT id FROM favorites WHERE user_id = ? AND doctor_id = ?',
    [req.user.id, parseInt(req.params.doctorId)]);
  res.json({ isFavorite: !!fav });
});

module.exports = router;
