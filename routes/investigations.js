const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getLastInsertId, getChanges } = require('../database/setup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', (req, res) => {
  try {
    const { search, location, test_type, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM investigation_centers WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM investigation_centers WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const clause = ' AND (LOWER(name) LIKE LOWER(?) OR LOWER(available_tests) LIKE LOWER(?) OR LOWER(address) LIKE LOWER(?))';
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

    if (test_type && test_type !== 'all') {
      query += ' AND available_tests LIKE ?';
      countQuery += ' AND available_tests LIKE ?';
      params.push(`%${test_type}%`);
      countParams.push(`%${test_type}%`);
    }

    const countRow = getOne(countQuery, countParams);
    const total = countRow ? countRow.total : 0;

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const centers = getAll(query, params);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({ centers, total, page: parseInt(page), totalPages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch investigation centers.' });
  }
});

router.get('/locations', (req, res) => {
  const locations = getAll('SELECT DISTINCT location FROM investigation_centers ORDER BY location');
  res.json({ locations: locations.map(l => l.location) });
});

router.get('/test-types', (req, res) => {
  const rows = getAll('SELECT available_tests FROM investigation_centers');
  const typesSet = new Set();
  rows.forEach(r => {
    r.available_tests.split(',').forEach(t => {
      const trimmed = t.trim();
      if (trimmed) typesSet.add(trimmed);
    });
  });
  const types = Array.from(typesSet).sort();
  res.json({ types });
});

router.get('/:id', (req, res) => {
  const center = getOne('SELECT * FROM investigation_centers WHERE id = ?', [parseInt(req.params.id)]);
  if (!center) return res.status(404).json({ error: 'Investigation center not found.' });
  res.json({ center });
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, location, address, available_tests, contact, opening_hours } = req.body;
    if (!name || !location || !address || !available_tests || !contact || !opening_hours) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    runQuery(
      'INSERT INTO investigation_centers (name, location, address, available_tests, contact, opening_hours) VALUES (?, ?, ?, ?, ?, ?)',
      [name, location, address, available_tests, contact, opening_hours]
    );
    res.status(201).json({ message: 'Investigation center added.', id: getLastInsertId() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add investigation center.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, location, address, available_tests, contact, opening_hours } = req.body;
    const existing = getOne('SELECT id FROM investigation_centers WHERE id = ?', [parseInt(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'Center not found.' });

    runQuery(
      'UPDATE investigation_centers SET name=?, location=?, address=?, available_tests=?, contact=?, opening_hours=? WHERE id=?',
      [name, location, address, available_tests, contact, opening_hours, parseInt(req.params.id)]
    );
    res.json({ message: 'Investigation center updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update center.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    runQuery('DELETE FROM investigation_centers WHERE id = ?', [parseInt(req.params.id)]);
    if (getChanges() === 0) return res.status(404).json({ error: 'Center not found.' });
    res.json({ message: 'Investigation center deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete center.' });
  }
});

module.exports = router;
