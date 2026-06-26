const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

router.get('/:doctorId', (req, res) => {
  const reviews = getAll(`
    SELECT r.*, u.name as user_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.doctor_id = ?
    ORDER BY r.created_at DESC
  `, [parseInt(req.params.doctorId)]);
  res.json({ reviews });
});

router.post('/:doctorId', authenticateToken, (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const doctorId = parseInt(req.params.doctorId);
    const doctor = getOne('SELECT id FROM doctors WHERE id = ?', [doctorId]);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    const existing = getOne('SELECT id FROM reviews WHERE user_id = ? AND doctor_id = ?',
      [req.user.id, doctorId]);

    if (existing) {
      runQuery('UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
        [rating, comment || '', existing.id]);
    } else {
      runQuery('INSERT INTO reviews (user_id, doctor_id, rating, comment) VALUES (?, ?, ?, ?)',
        [req.user.id, doctorId, rating, comment || '']);
    }

    const stats = getOne('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE doctor_id = ?',
      [doctorId]);

    const avgRating = Math.round((stats.avg_rating || 0) * 10) / 10;
    runQuery('UPDATE doctors SET rating = ?, review_count = ? WHERE id = ?',
      [avgRating, stats.count, doctorId]);

    res.json({ message: 'Review submitted.', avgRating, reviewCount: stats.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

module.exports = router;
