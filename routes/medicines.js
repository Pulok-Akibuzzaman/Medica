const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getLastInsertId, getChanges } = require('../database/setup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', (req, res) => {
  try {
    const { search, category, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Relevance ranking: an exact/prefix match on the medicine's own name
    // is what a user searching "Napa" actually wants, not just any row
    // whose `uses` text happens to mention the term somewhere. Without this,
    // ORDER BY name ASC sorted purely alphabetically, so the real "Napa"
    // brand could be buried behind dozens of unrelated matches.
    let query = 'SELECT * FROM medicines WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM medicines WHERE 1=1';
    const params = [];
    const countParams = [];
    let orderClause = 'ORDER BY name ASC';
    let orderParams = [];

    if (search) {
      const clause = ' AND (LOWER(name) LIKE LOWER(?) OR LOWER(generic_name) LIKE LOWER(?) OR LOWER(uses) LIKE LOWER(?))';
      query += clause;
      countQuery += clause;
      const term = `%${search}%`;
      params.push(term, term, term);
      countParams.push(term, term, term);

      orderClause = `ORDER BY
        CASE
          WHEN LOWER(name) = LOWER(?) THEN 0
          WHEN LOWER(name) LIKE LOWER(?) THEN 1
          WHEN LOWER(generic_name) = LOWER(?) THEN 2
          WHEN LOWER(generic_name) LIKE LOWER(?) THEN 3
          WHEN LOWER(name) LIKE LOWER(?) THEN 4
          WHEN LOWER(generic_name) LIKE LOWER(?) THEN 5
          ELSE 6
        END ASC, name ASC`;
      orderParams = [search, `${search}%`, search, `${search}%`, `%${search}%`, `%${search}%`];
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

    const medicines = getAll(query, params);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({ medicines, total, page: parseInt(page), totalPages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch medicines.' });
  }
});

router.get('/categories', (req, res) => {
  const categories = getAll('SELECT DISTINCT category FROM medicines ORDER BY category');
  res.json({ categories: categories.map(c => c.category) });
});

router.get('/:id', (req, res) => {
  const medicine = getOne('SELECT * FROM medicines WHERE id = ?', [parseInt(req.params.id)]);
  if (!medicine) return res.status(404).json({ error: 'Medicine not found.' });
  res.json({ medicine });
});

router.get('/:id/related', (req, res) => {
  try {
    const medicine = getOne('SELECT id, category, generic_name, price FROM medicines WHERE id = ?', [parseInt(req.params.id)]);
    if (!medicine) return res.status(404).json({ error: 'Medicine not found.' });

    // Cheaper same-category alternatives first (same generic = direct
    // substitute, ranked top), cheapest first.
    let related = getAll(
      `SELECT id, name, generic_name, category, price FROM medicines
       WHERE id != ? AND category = ? AND price < ?
       ORDER BY (generic_name = ?) DESC, price ASC LIMIT 4`,
      [medicine.id, medicine.category, medicine.price, medicine.generic_name]
    );

    // If nothing cheaper exists, fall back to any same-category medicine
    if (related.length === 0) {
      related = getAll(
        `SELECT id, name, generic_name, category, price FROM medicines
         WHERE id != ? AND category = ?
         ORDER BY (generic_name = ?) DESC, price ASC LIMIT 4`,
        [medicine.id, medicine.category, medicine.generic_name]
      );
    }

    res.json({ related, basePrice: medicine.price });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch related medicines.' });
  }
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, generic_name, uses, dosage, side_effects, warnings, category, price, stock } = req.body;

    if (!name || !generic_name || !uses || !dosage || !side_effects || !warnings) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    runQuery(
      'INSERT INTO medicines (name, generic_name, uses, dosage, side_effects, warnings, category, price, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, generic_name, uses, dosage, side_effects, warnings, category || 'General', parseFloat(price) || 0, parseInt(stock) || 100]
    );

    res.status(201).json({ message: 'Medicine added.', id: getLastInsertId() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add medicine.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, generic_name, uses, dosage, side_effects, warnings, category, price, stock } = req.body;

    const existing = getOne('SELECT id FROM medicines WHERE id = ?', [parseInt(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'Medicine not found.' });

    runQuery(
      'UPDATE medicines SET name=?, generic_name=?, uses=?, dosage=?, side_effects=?, warnings=?, category=?, price=?, stock=? WHERE id=?',
      [name, generic_name, uses, dosage, side_effects, warnings, category || 'General', parseFloat(price) || 0, parseInt(stock) || 100, parseInt(req.params.id)]
    );

    res.json({ message: 'Medicine updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update medicine.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    runQuery('DELETE FROM medicines WHERE id = ?', [parseInt(req.params.id)]);
    if (getChanges() === 0) return res.status(404).json({ error: 'Medicine not found.' });
    runQuery('DELETE FROM cart_items WHERE medicine_id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Medicine deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete medicine.' });
  }
});

module.exports = router;
