const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getLastInsertId, getChanges } = require('../database/setup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', (req, res) => {
  try {
    const { search, location, specialty, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM doctors WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM doctors WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const clause = ' AND (name LIKE ? OR hospital LIKE ? OR specialty LIKE ?)';
      query += clause;
      countQuery += clause;
      const term = `%${search}%`;
      params.push(term, term, term);
      countParams.push(term, term, term);
    }

    if (location && location !== 'all') {
      query += ' AND location = ?';
      countQuery += ' AND location = ?';
      params.push(location);
      countParams.push(location);
    }

    if (specialty && specialty !== 'all') {
      query += ' AND specialty = ?';
      countQuery += ' AND specialty = ?';
      params.push(specialty);
      countParams.push(specialty);
    }

    const countRow = getOne(countQuery, countParams);
    const total = countRow ? countRow.total : 0;

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const doctors = getAll(query, params);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({ doctors, total, page: parseInt(page), totalPages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch doctors.' });
  }
});

router.get('/locations', (req, res) => {
  const locations = getAll('SELECT DISTINCT location FROM doctors ORDER BY location');
  res.json({ locations: locations.map(l => l.location) });
});

router.get('/specialties', (req, res) => {
  const specialties = getAll('SELECT DISTINCT specialty FROM doctors ORDER BY specialty');
  res.json({ specialties: specialties.map(s => s.specialty) });
});

router.get('/:id', (req, res) => {
  const doctor = getOne('SELECT * FROM doctors WHERE id = ?', [parseInt(req.params.id)]);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });
  res.json({ doctor });
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, hospital, specialty, location, contact, email } = req.body;

    if (!name || !hospital || !specialty || !location || !contact) {
      return res.status(400).json({ error: 'All required fields must be filled.' });
    }

    runQuery(
      'INSERT INTO doctors (name, hospital, specialty, location, contact, email) VALUES (?, ?, ?, ?, ?, ?)',
      [name, hospital, specialty, location, contact, email || null]
    );

    res.status(201).json({ message: 'Doctor added.', id: getLastInsertId() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add doctor.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, hospital, specialty, location, contact, email } = req.body;

    const existing = getOne('SELECT id FROM doctors WHERE id = ?', [parseInt(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'Doctor not found.' });

    runQuery(
      'UPDATE doctors SET name=?, hospital=?, specialty=?, location=?, contact=?, email=? WHERE id=?',
      [name, hospital, specialty, location, contact, email || null, parseInt(req.params.id)]
    );

    res.json({ message: 'Doctor updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update doctor.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    runQuery('DELETE FROM doctors WHERE id = ?', [parseInt(req.params.id)]);
    if (getChanges() === 0) return res.status(404).json({ error: 'Doctor not found.' });
    runQuery('DELETE FROM favorites WHERE doctor_id = ?', [parseInt(req.params.id)]);
    runQuery('DELETE FROM reviews WHERE doctor_id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Doctor deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete doctor.' });
  }
});

module.exports = router;
