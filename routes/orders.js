const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getLastInsertId, getChanges, saveDb } = require('../database/setup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const DELIVERY_FEE = 50;

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

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const total = Math.round((subtotal + DELIVERY_FEE) * 100) / 100;

    // Generate tracking number
    const trackingNumber = 'TRK' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
    // Calculate estimated delivery (3-5 business days)
    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 4);

    runQuery(
      'INSERT INTO orders (user_id, total, status, shipping_name, shipping_phone, shipping_address, tracking_number, delivery_status, estimated_delivery, current_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, total, 'pending', shipping_name, shipping_phone, shipping_address, trackingNumber, 'pending', estDelivery.toISOString().split('T')[0], 'Warehouse']
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
    const query = `
      SELECT o.*, d.name AS delivery_person_name, d.email AS delivery_person_email
      FROM orders o
      LEFT JOIN users d ON d.id = o.delivery_person_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;
    const orders = getAll(query, [req.user.id]);
    orders.forEach(o => {
      o.items = getAll('SELECT medicine_id, medicine_name, price, quantity FROM order_items WHERE order_id = ?', [o.id]);
    });
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// User cancels order (MUST be before router.get('/:id'))
router.put('/:id/cancel', authenticateToken, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { cancellation_reason } = req.body;

    const order = getOne('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, req.user.id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order is already cancelled.' });
    }

    if (order.delivery_status === 'delivered' || order.delivery_status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel a delivered or already cancelled order.' });
    }

    const now = new Date().toISOString();
    runQuery(
      'UPDATE orders SET status = ?, delivery_status = ?, cancellation_reason = ?, updated_at = ? WHERE id = ?',
      ['cancelled', 'cancelled', cancellation_reason || '', now, orderId]
    );
    saveDb();

    res.json({ message: 'Order cancelled successfully. Refund will be processed within 3-5 business days.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

// Get all users registered as delivery personnel for admin selection
router.get('/admin/delivery-personnel', authenticateToken, requireAdmin, (req, res) => {
  try {
    const deliveryPersonnel = getAll("SELECT id, name, email FROM users WHERE role = 'delivery_man' ORDER BY name ASC");
    res.json({ deliveryPersonnel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch delivery personnel.' });
  }
});

// All orders for admin (shipping & delivery management)
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT o.*, u.name AS user_name, u.email AS user_email, d.name AS delivery_person_name, d.email AS delivery_person_email
                 FROM orders o 
                 JOIN users u ON u.id = o.user_id
                 LEFT JOIN users d ON d.id = o.delivery_person_id`;
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

// Admin assigns delivery person to an order
router.put('/:id/assign', authenticateToken, requireAdmin, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { delivery_person_id } = req.body;

    const order = getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    let assignedId = null;
    let assignedName = 'Unassigned';

    if (delivery_person_id) {
      const deliveryPerson = getOne("SELECT id, name FROM users WHERE id = ? AND role = 'delivery_man'", [parseInt(delivery_person_id)]);
      if (!deliveryPerson) {
        return res.status(400).json({ error: 'Selected user is not a valid delivery person.' });
      }
      assignedId = deliveryPerson.id;
      assignedName = deliveryPerson.name;
    }

    const now = new Date().toISOString();
    runQuery('UPDATE orders SET delivery_person_id = ?, updated_at = ? WHERE id = ?', [assignedId, now, orderId]);
    saveDb();

    res.json({
      message: `Order #${orderId} assigned to ${assignedName}.`,
      delivery_person_id: assignedId,
      delivery_person_name: assignedName
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign delivery person.' });
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
    const now = new Date().toISOString();
    runQuery('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [status, now, parseInt(req.params.id)]);
    if (getChanges() === 0) return res.status(404).json({ error: 'Order not found.' });
    saveDb();
    res.json({ message: 'Order status updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// Admin updates delivery tracking
router.put('/:id/tracking', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { delivery_status, current_location } = req.body;
    const validDeliveryStatuses = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

    if (!delivery_status || !validDeliveryStatuses.includes(delivery_status)) {
      return res.status(400).json({ error: `Delivery status must be one of: ${validDeliveryStatuses.join(', ')}` });
    }

    const now = new Date().toISOString();
    let deliveryDate = null;
    if (delivery_status === 'delivered') {
      deliveryDate = new Date().toISOString().split('T')[0];
    }

    const query = deliveryDate
      ? 'UPDATE orders SET delivery_status = ?, current_location = ?, delivery_date = ?, updated_at = ? WHERE id = ?'
      : 'UPDATE orders SET delivery_status = ?, current_location = ?, updated_at = ? WHERE id = ?';

    const params = deliveryDate
      ? [delivery_status, current_location || '', deliveryDate, now, parseInt(req.params.id)]
      : [delivery_status, current_location || '', now, parseInt(req.params.id)];

    runQuery(query, params);
    if (getChanges() === 0) return res.status(404).json({ error: 'Order not found.' });
    saveDb();
    res.json({ message: 'Delivery tracking updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update delivery tracking.' });
  }
});

module.exports = router;
