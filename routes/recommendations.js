const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

// Score weights per signal. Tuned so purchase history (strongest intent)
// dominates, health profile and collaborative filtering meaningfully
// influence ranking, and recent browsing gives a light nudge.
const WEIGHTS = {
  reorder: 8,        // bought before, likely to run out / refill
  chronicMatch: 6,    // matches a chronic condition on file
  collaborative: 4,    // co-purchased with things this user bought
  categoryHistory: 3,  // same category as past purchases
  browsed: 2           // viewed recently but never bought
};

const STOPWORDS = new Set(['and', 'the', 'for', 'with', 'from', 'this', 'that', 'have', 'has']);

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function splitList(text) {
  if (!text) return [];
  return text.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

router.get('/', authenticateToken, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);
    const userId = req.user.id;

    const user = getOne('SELECT allergies, chronic_diseases FROM users WHERE id = ?', [userId]);
    const allergyTerms = splitList(user && user.allergies);
    const chronicTerms = splitList(user && user.chronic_diseases)
      .flatMap(term => tokenize(term));

    const purchasedRows = getAll(
      `SELECT m.id, m.category, m.generic_name, COUNT(*) AS times
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN medicines m ON m.id = oi.medicine_id
       WHERE o.user_id = ?
       GROUP BY m.id`,
      [userId]
    );
    const purchasedIds = new Set(purchasedRows.map(r => r.id));
    const purchasedCategories = new Set(purchasedRows.map(r => r.category));

    const viewedRows = getAll(
      `SELECT DISTINCT medicine_id FROM medicine_views
       WHERE user_id = ? AND created_at >= datetime('now', '-30 days')`,
      [userId]
    );
    const viewedIds = viewedRows.map(r => r.medicine_id);

    // Candidate pool: everything except what's already been bought.
    const candidates = getAll(
      `SELECT id, name, generic_name, category, uses, price, stock
       FROM medicines WHERE stock > 0`
    );

    const scores = new Map(); // id -> { score, reasons: Set }

    function addScore(id, points, reason) {
      if (!scores.has(id)) scores.set(id, { score: 0, reasons: new Set() });
      const entry = scores.get(id);
      entry.score += points;
      if (reason) entry.reasons.add(reason);
    }

    // --- Health profile: boost medicines whose `uses` text matches a
    // chronic condition, exclude anything matching a known allergy. ---
    const byId = new Map(candidates.map(m => [m.id, m]));
    for (const m of candidates) {
      const usesTokens = new Set(tokenize(m.uses));
      const nameLower = m.name.toLowerCase();
      const genericLower = m.generic_name.toLowerCase();

      const isAllergen = allergyTerms.some(term =>
        term.length > 2 && (nameLower.includes(term) || genericLower.includes(term))
      );
      if (isAllergen) continue; // never recommend a known allergen

      for (const term of chronicTerms) {
        if (usesTokens.has(term)) {
          addScore(m.id, WEIGHTS.chronicMatch, `Matches your health profile`);
          break;
        }
      }
    }

    // --- Purchase history: refills for things already bought, plus
    // same-category picks (excluding items already owned). ---
    for (const p of purchasedRows) {
      addScore(p.id, WEIGHTS.reorder, 'Time to reorder');
    }
    for (const m of candidates) {
      if (purchasedIds.has(m.id)) continue;
      if (purchasedCategories.has(m.category)) {
        addScore(m.id, WEIGHTS.categoryHistory, `Because you bought ${m.category} items`);
      }
    }

    // --- Collaborative filtering: users who bought the same things this
    // user bought also bought X. ---
    if (purchasedIds.size > 0) {
      const placeholders = Array.from(purchasedIds).map(() => '?').join(',');
      const cooccurring = getAll(
        `SELECT oi2.medicine_id AS id, COUNT(DISTINCT o1.user_id) AS strength
         FROM order_items oi1
         JOIN orders o1 ON o1.id = oi1.order_id
         JOIN order_items oi2 ON oi2.order_id = o1.id
         WHERE oi1.medicine_id IN (${placeholders}) AND o1.user_id != ?
         GROUP BY oi2.medicine_id
         ORDER BY strength DESC LIMIT 30`,
        [...purchasedIds, userId]
      );
      for (const row of cooccurring) {
        if (purchasedIds.has(row.id)) continue;
        addScore(row.id, WEIGHTS.collaborative, 'Popular with similar patients');
      }
    }

    // --- Browsing behavior: viewed recently, never purchased. ---
    for (const id of viewedIds) {
      if (purchasedIds.has(id)) continue;
      addScore(id, WEIGHTS.browsed, 'Based on what you viewed');
    }

    let ranked = Array.from(scores.entries())
      .filter(([id]) => byId.has(id))
      .map(([id, { score, reasons }]) => ({
        ...byId.get(id),
        score,
        reason: Array.from(reasons)[0]
      }))
      .sort((a, b) => b.score - a.score);

    // Cold start: no signal at all yet (new user, no orders/views/profile
    // matches) — fall back to best-selling medicines platform-wide.
    if (ranked.length === 0) {
      const popular = getAll(
        `SELECT m.id, m.name, m.generic_name, m.category, m.uses, m.price, m.stock, COUNT(*) AS times
         FROM order_items oi JOIN medicines m ON m.id = oi.medicine_id
         WHERE m.stock > 0
         GROUP BY m.id ORDER BY times DESC LIMIT ?`,
        [limit]
      );
      ranked = popular.map(m => ({ ...m, score: 0, reason: 'Popular right now' }));
    }

    res.json({ recommendations: ranked.slice(0, limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
});

// Fire-and-forget view tracking, called when a user opens a medicine's detail.
router.post('/track-view', authenticateToken, (req, res) => {
  try {
    const medicineId = parseInt(req.body.medicine_id);
    if (!medicineId) return res.status(400).json({ error: 'medicine_id is required.' });
    runQuery('INSERT INTO medicine_views (user_id, medicine_id) VALUES (?, ?)', [req.user.id, medicineId]);
    res.status(201).json({ message: 'Tracked.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to track view.' });
  }
});

// "You might also need" for the cart, based on items currently in it
// (same collaborative co-occurrence logic, scoped to the cart's contents).
router.get('/cart-suggestions', authenticateToken, (req, res) => {
  try {
    const cartItems = getAll('SELECT medicine_id FROM cart_items WHERE user_id = ?', [req.user.id]);
    if (cartItems.length === 0) return res.json({ recommendations: [] });

    const cartIds = new Set(cartItems.map(c => c.medicine_id));
    const placeholders = Array.from(cartIds).map(() => '?').join(',');

    const suggestions = getAll(
      `SELECT oi2.medicine_id AS id, m.name, m.generic_name, m.category, m.price, m.stock,
              COUNT(DISTINCT o1.id) AS strength
       FROM order_items oi1
       JOIN orders o1 ON o1.id = oi1.order_id
       JOIN order_items oi2 ON oi2.order_id = o1.id
       JOIN medicines m ON m.id = oi2.medicine_id
       WHERE oi1.medicine_id IN (${placeholders}) AND m.stock > 0
       GROUP BY oi2.medicine_id
       ORDER BY strength DESC LIMIT 20`,
      Array.from(cartIds)
    );

    const filtered = suggestions.filter(s => !cartIds.has(s.id)).slice(0, 4);
    res.json({ recommendations: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cart suggestions.' });
  }
});

module.exports = router;
