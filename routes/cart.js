const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getChanges } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const items = getAll(
      `SELECT c.medicine_id, c.quantity, m.name, m.generic_name, m.category, m.price, m.stock
       FROM cart_items c JOIN medicines m ON m.id = c.medicine_id
       WHERE c.user_id = ? ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ items, total: Math.round(total * 100) / 100 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cart.' });
  }
});

router.post('/', (req, res) => {
  try {
    const medicineId = parseInt(req.body.medicine_id);
    const quantity = Math.max(1, parseInt(req.body.quantity) || 1);

    const medicine = getOne('SELECT id, stock FROM medicines WHERE id = ?', [medicineId]);
    if (!medicine) return res.status(404).json({ error: 'Medicine not found.' });

    const existing = getOne(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND medicine_id = ?',
      [req.user.id, medicineId]
    );

    const newQty = (existing ? existing.quantity : 0) + quantity;
    if (newQty > medicine.stock) {
      return res.status(400).json({ error: 'Not enough stock available.' });
    }

    if (existing) {
      runQuery('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existing.id]);
    } else {
      runQuery('INSERT INTO cart_items (user_id, medicine_id, quantity) VALUES (?, ?, ?)', [req.user.id, medicineId, quantity]);
    }

    res.status(201).json({ message: 'Added to cart.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add to cart.' });
  }
});

router.put('/:medicineId', (req, res) => {
  try {
    const medicineId = parseInt(req.params.medicineId);
    const quantity = parseInt(req.body.quantity);

    if (isNaN(quantity)) return res.status(400).json({ error: 'Quantity is required.' });

    if (quantity <= 0) {
      runQuery('DELETE FROM cart_items WHERE user_id = ? AND medicine_id = ?', [req.user.id, medicineId]);
      return res.json({ message: 'Item removed from cart.' });
    }

    const medicine = getOne('SELECT stock FROM medicines WHERE id = ?', [medicineId]);
    if (!medicine) return res.status(404).json({ error: 'Medicine not found.' });
    if (quantity > medicine.stock) return res.status(400).json({ error: 'Not enough stock available.' });

    runQuery('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND medicine_id = ?', [quantity, req.user.id, medicineId]);
    if (getChanges() === 0) return res.status(404).json({ error: 'Item not in cart.' });
    res.json({ message: 'Cart updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update cart.' });
  }
});

router.delete('/:medicineId', (req, res) => {
  try {
    runQuery('DELETE FROM cart_items WHERE user_id = ? AND medicine_id = ?', [req.user.id, parseInt(req.params.medicineId)]);
    if (getChanges() === 0) return res.status(404).json({ error: 'Item not in cart.' });
    res.json({ message: 'Item removed from cart.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove item.' });
  }
});

router.delete('/', (req, res) => {
  try {
    runQuery('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear cart.' });
  }
});

module.exports = router;
