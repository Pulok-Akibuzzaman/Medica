const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getLastInsertId, getChanges } = require('../database/setup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', (req, res) => {
  try {
    const { search, category, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM diseases WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM diseases WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      const clause = ' AND (name LIKE ? OR overview LIKE ? OR symptoms LIKE ?)';
      query += clause;
      countQuery += clause;
      const term = `%${search}%`;
      params.push(term, term, term);
      countParams.push(term, term, term);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      countQuery += ' AND category = ?';
      params.push(category);
      countParams.push(category);
    }

    const countRow = getOne(countQuery, countParams);
    const total = countRow ? countRow.total : 0;

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const diseases = getAll(query, params);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({ diseases, total, page: parseInt(page), totalPages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch diseases.' });
  }
});

router.get('/categories', (req, res) => {
  const categories = getAll('SELECT DISTINCT category FROM diseases ORDER BY category');
  res.json({ categories: categories.map(c => c.category) });
});

router.get('/:id', (req, res) => {
  const disease = getOne('SELECT * FROM diseases WHERE id = ?', [parseInt(req.params.id)]);
  if (!disease) return res.status(404).json({ error: 'Disease not found.' });

  let doctors = [];
  if (disease.related_specialties) {
    const specs = disease.related_specialties.split(',').map(s => s.trim()).filter(Boolean);
    if (specs.length > 0) {
      const placeholders = specs.map(() => '?').join(',');
      doctors = getAll(
        `SELECT id, name, hospital, specialty, location, contact FROM doctors WHERE specialty IN (${placeholders}) LIMIT 5`,
        specs
      );
    }
  }

  const investigations = getAll(
    `SELECT id, name, location, available_tests, contact FROM investigation_centers
     WHERE available_tests LIKE ? LIMIT 5`,
    [`%${disease.name.split(' ')[0]}%`]
  );

  res.json({ disease, relatedDoctors: doctors, relatedInvestigations: investigations });
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, category, overview, causes, symptoms, risk_factors, diagnosis, treatment, prevention, related_specialties } = req.body;
    if (!name || !overview || !causes || !symptoms || !risk_factors || !diagnosis || !treatment || !prevention) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    runQuery(
      `INSERT INTO diseases (name, category, overview, causes, symptoms, risk_factors, diagnosis, treatment, prevention, related_specialties)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category || 'General', overview, causes, symptoms, risk_factors, diagnosis, treatment, prevention, related_specialties || '']
    );
    res.status(201).json({ message: 'Disease article added.', id: getLastInsertId() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add disease.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, category, overview, causes, symptoms, risk_factors, diagnosis, treatment, prevention, related_specialties } = req.body;
    const existing = getOne('SELECT id FROM diseases WHERE id = ?', [parseInt(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'Disease not found.' });

    runQuery(
      `UPDATE diseases SET name=?, category=?, overview=?, causes=?, symptoms=?, risk_factors=?, diagnosis=?, treatment=?, prevention=?, related_specialties=? WHERE id=?`,
      [name, category || 'General', overview, causes, symptoms, risk_factors, diagnosis, treatment, prevention, related_specialties || '', parseInt(req.params.id)]
    );
    res.json({ message: 'Disease article updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update disease.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    runQuery('DELETE FROM diseases WHERE id = ?', [parseInt(req.params.id)]);
    if (getChanges() === 0) return res.status(404).json({ error: 'Disease not found.' });
    res.json({ message: 'Disease article deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete disease.' });
  }
});

module.exports = router;
