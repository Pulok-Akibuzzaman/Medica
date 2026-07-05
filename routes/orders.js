const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getLastInsertId, getChanges, saveDb } = require('../database/setup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// Place an order from the current cart (checkout)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { shipping_name, shipping_phone, shipping_address } = req.body;
    if (!shipping_name || !shipping_phone || !shipping_address) {
      return res.status(400).json({ error: 'Shipping name, phone, and address are required.' });
    }

    const items = getAll(
      `SELECT c.medicine_id, c.quantity, m.name, m.price, m.stock
       FROM cart_items c JOIN medicines m ON m.id = c.medicine_id
       WHERE c.user_id = ?`,
      [req.user.id]
    );
    if (items.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });

    for (const item of items) {
      if (item.quantity > item.stock) {
        return res.status(400).json({ error: `Not enough stock for ${item.name}.` });
      }
    }

    const total = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

    runQuery(
      'INSERT INTO orders (user_id, total, status, shipping_name, shipping_phone, shipping_address) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, total, 'pending', shipping_name, shipping_phone, shipping_address]
    );
    const orderId = getLastInsertId();

    for (const item of items) {
      runQuery(
        'INSERT INTO order_items (order_id, medicine_id, medicine_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.medicine_id, item.name, item.price, item.quantity]
      );
      runQuery('UPDATE medicines SET stock = stock - ? WHERE id = ?', [item.quantity, item.medicine_id]);
    }
    runQuery('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    saveDb();

    res.status(201).json({ message: 'Order placed successfully.', orderId, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to place order.' });
  }
});

// Current user's order history
router.get('/', authenticateToken, (req, res) => {
  try {
    const orders = getAll('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    orders.forEach(o => {
      o.items = getAll('SELECT medicine_id, medicine_name, price, quantity FROM order_items WHERE order_id = ?', [o.id]);
    });
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// All orders for admin (shipping management)
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT o.*, u.name AS user_name, u.email AS user_email
                 FROM orders o JOIN users u ON u.id = o.user_id`;
    const params = [];
    if (status && status !== 'all') {
      query += ' WHERE o.status = ?';
      params.push(status);
    }
    query += ' ORDER BY o.created_at DESC';

    const orders = getAll(query, params);
    orders.forEach(o => {
      o.items = getAll('SELECT medicine_id, medicine_name, price, quantity FROM order_items WHERE order_id = ?', [o.id]);
    });
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const order = getOne('SELECT * FROM orders WHERE id = ?', [parseInt(req.params.id)]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    order.items = getAll('SELECT medicine_id, medicine_name, price, quantity FROM order_items WHERE order_id = ?', [order.id]);
    res.json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

// Admin updates shipping status
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    runQuery('UPDATE orders SET status = ? WHERE id = ?', [status, parseInt(req.params.id)]);
    if (getChanges() === 0) return res.status(404).json({ error: 'Order not found.' });
    saveDb();
    res.json({ message: 'Order status updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

module.exports = router;
