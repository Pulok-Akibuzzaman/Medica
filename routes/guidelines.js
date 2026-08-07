const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getLastInsertId, getChanges } = require('../database/setup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', (req, res) => {
  try {
    const { search, type, category, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM guidelines WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM guidelines WHERE 1=1';
    const params = [];
    const countParams = [];
    let orderClause = 'ORDER BY publication_date DESC, title ASC';
    let orderParams = [];

    if (type && type !== 'all') {
      query += ' AND type = ?';
      countQuery += ' AND type = ?';
      params.push(type);
      countParams.push(type);
    }

    if (search) {
      const clause = ' AND (LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(authority) LIKE LOWER(?))';
      query += clause;
      countQuery += clause;
      const term = `%${search}%`;
      params.push(term, term, term);
      countParams.push(term, term, term);

      // When actually searching, rank an exact/prefix match on the title
      // above a coincidental hit in description/authority text or the
      // newest-first default.
      orderClause = `ORDER BY
        CASE
          WHEN LOWER(title) = LOWER(?) THEN 0
          WHEN LOWER(title) LIKE LOWER(?) THEN 1
          WHEN LOWER(title) LIKE LOWER(?) THEN 2
          ELSE 3
        END ASC, publication_date DESC, title ASC`;
      orderParams = [search, `${search}%`, `%${search}%`];
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      countQuery += ' AND category = ?';
      params.push(category);
      countParams.push(category);
    }

    const countRow = getOne(countQuery, countParams);
    const total = countRow ? countRow.total : 0;

    query += ` ${orderClause} LIMIT ? OFFSET ?`;
    params.push(...orderParams, parseInt(limit), offset);

    const guidelines = getAll(query, params);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({ guidelines, total, page: parseInt(page), totalPages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch guidelines.' });
  }
});

router.get('/categories', (req, res) => {
  const categories = getAll('SELECT DISTINCT category FROM guidelines ORDER BY category');
  res.json({ categories: categories.map(c => c.category) });
});

router.get('/:id', (req, res) => {
  const guideline = getOne('SELECT * FROM guidelines WHERE id = ?', [parseInt(req.params.id)]);
  if (!guideline) return res.status(404).json({ error: 'Guideline not found.' });
  res.json({ guideline });
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, type, category, authority, publication_date, link } = req.body;
    if (!title || !description || !authority) {
      return res.status(400).json({ error: 'Title, description, and authority are required.' });
    }
    runQuery(
      'INSERT INTO guidelines (title, description, type, category, authority, publication_date, link) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, type || 'national', category || 'General', authority, publication_date || null, link || null]
    );
    res.status(201).json({ message: 'Guideline added.', id: getLastInsertId() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add guideline.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, type, category, authority, publication_date, link } = req.body;
    const existing = getOne('SELECT id FROM guidelines WHERE id = ?', [parseInt(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'Guideline not found.' });

    runQuery(
      'UPDATE guidelines SET title=?, description=?, type=?, category=?, authority=?, publication_date=?, link=? WHERE id=?',
      [title, description, type || 'national', category || 'General', authority, publication_date || null, link || null, parseInt(req.params.id)]
    );
    res.json({ message: 'Guideline updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update guideline.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    runQuery('DELETE FROM guidelines WHERE id = ?', [parseInt(req.params.id)]);
    if (getChanges() === 0) return res.status(404).json({ error: 'Guideline not found.' });
    res.json({ message: 'Guideline deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete guideline.' });
  }
});

module.exports = router;
