const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getChanges, saveDb } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

function requireDeliveryPerson(req, res, next) {
  if (req.user.role !== 'delivery_man' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Delivery personnel access required.' });
  }
  next();
}

// Get summary stats for the logged in delivery person
router.get('/stats', authenticateToken, requireDeliveryPerson, (req, res) => {
  try {
    const userId = req.user.id;
    const isDeliveryMan = req.user.role === 'delivery_man';

    let totalQuery = 'SELECT COUNT(*) as count FROM orders';
    let activeQuery = "SELECT COUNT(*) as count FROM orders WHERE delivery_status IN ('pending', 'processing', 'shipped', 'out_for_delivery')";
    let deliveredTodayQuery = "SELECT COUNT(*) as count FROM orders WHERE delivery_status = 'delivered' AND delivery_date = ?";
    let totalDeliveredQuery = "SELECT COUNT(*) as count FROM orders WHERE delivery_status = 'delivered'";

    const params = [];
    if (isDeliveryMan) {
      totalQuery += ' WHERE delivery_person_id = ?';
      activeQuery += ' AND delivery_person_id = ?';
      deliveredTodayQuery += ' AND delivery_person_id = ?';
      totalDeliveredQuery += ' AND delivery_person_id = ?';
      params.push(userId);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const totalAssigned = getOne(totalQuery, isDeliveryMan ? [userId] : [])?.count || 0;
    const activeDeliveries = getOne(activeQuery, isDeliveryMan ? [userId] : [])?.count || 0;
    const deliveredToday = getOne(deliveredTodayQuery, isDeliveryMan ? [todayStr, userId] : [todayStr])?.count || 0;
    const totalDelivered = getOne(totalDeliveredQuery, isDeliveryMan ? [userId] : [])?.count || 0;
    const availableOrders = getOne("SELECT COUNT(*) as count FROM orders WHERE (delivery_person_id IS NULL OR delivery_person_id = 0) AND status NOT IN ('cancelled', 'delivered')")?.count || 0;

    res.json({
      totalAssigned,
      activeDeliveries,
      deliveredToday,
      totalDelivered,
      availableOrders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch delivery statistics.' });
  }
});

// Get assigned orders (and available unassigned orders) for logged in delivery person
router.get('/orders', authenticateToken, requireDeliveryPerson, (req, res) => {
  try {
    const { status, filter } = req.query;
    const isDeliveryMan = req.user.role === 'delivery_man';

    let query = `
      SELECT o.*, u.name AS customer_name, u.email AS customer_email
      FROM orders o
      JOIN users u ON u.id = o.user_id
    `;
    const conditions = [];
    const params = [];

    if (filter === 'available') {
      // Unassigned orders available for pickup
      conditions.push('(o.delivery_person_id IS NULL OR o.delivery_person_id = 0)');
      conditions.push("o.status NOT IN ('cancelled', 'delivered')");
    } else if (filter === 'completed') {
      if (isDeliveryMan) {
        conditions.push('o.delivery_person_id = ?');
        params.push(req.user.id);
      }
      conditions.push("o.delivery_status IN ('delivered', 'cancelled')");
    } else if (filter === 'active') {
      // Show orders assigned to this delivery man OR unassigned orders waiting for pickup
      if (isDeliveryMan) {
        conditions.push("(o.delivery_person_id = ? OR (o.delivery_person_id IS NULL OR o.delivery_person_id = 0))");
        params.push(req.user.id);
      }
      conditions.push("o.delivery_status IN ('pending', 'processing', 'shipped', 'out_for_delivery')");
      conditions.push("o.status NOT IN ('cancelled', 'delivered')");
    } else {
      // All orders
      if (isDeliveryMan) {
        conditions.push('(o.delivery_person_id = ? OR o.delivery_person_id IS NULL OR o.delivery_person_id = 0)');
        params.push(req.user.id);
      }
      if (status && status !== 'all') {
        conditions.push('o.delivery_status = ?');
        params.push(status);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.created_at DESC';

    const orders = getAll(query, params);
    orders.forEach(o => {
      o.items = getAll('SELECT medicine_id, medicine_name, price, quantity FROM order_items WHERE order_id = ?', [o.id]);
    });

    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch delivery orders.' });
  }
});

// Claim/Accept an available unassigned order
router.put('/orders/:id/claim', authenticateToken, requireDeliveryPerson, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = getOne('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.delivery_person_id && order.delivery_person_id !== req.user.id) {
      return res.status(400).json({ error: 'This order has already been assigned to another delivery person.' });
    }

    const now = new Date().toISOString();
    runQuery(
      "UPDATE orders SET delivery_person_id = ?, delivery_status = 'processing', current_location = 'Picked up by delivery agent', updated_at = ? WHERE id = ?",
      [req.user.id, now, orderId]
    );

    saveDb();

    res.json({ message: `Order #${orderId} accepted and assigned to you!`, orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to claim order.' });
  }
});

// Update status & location of an assigned order
router.put('/orders/:id/status', authenticateToken, requireDeliveryPerson, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { delivery_status, current_location, estimated_delivery } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    if (delivery_status && !validStatuses.includes(delivery_status)) {
      return res.status(400).json({ error: `Invalid delivery status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (req.user.role === 'delivery_man' && order.delivery_person_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You are not assigned to this order.' });
    }

    const now = new Date().toISOString();
    const newDeliveryStatus = delivery_status || order.delivery_status;
    const newLocation = (current_location !== undefined) ? current_location : (order.current_location || '');
    const newEstimated = estimated_delivery || order.estimated_delivery;

    let deliveryDate = order.delivery_date;
    if (newDeliveryStatus === 'delivered' && !deliveryDate) {
      deliveryDate = new Date().toISOString().split('T')[0];
    }

    let overallStatus = order.status;
    if (newDeliveryStatus === 'delivered') {
      overallStatus = 'delivered';
    } else if (newDeliveryStatus === 'shipped' || newDeliveryStatus === 'out_for_delivery') {
      overallStatus = 'shipped';
    } else if (newDeliveryStatus === 'cancelled') {
      overallStatus = 'cancelled';
    }

    runQuery(
      `UPDATE orders 
       SET delivery_status = ?, status = ?, current_location = ?, estimated_delivery = ?, delivery_date = ?, updated_at = ?
       WHERE id = ?`,
      [newDeliveryStatus, overallStatus, newLocation, newEstimated, deliveryDate, now, orderId]
    );

    saveDb();

    res.json({
      message: 'Order delivery status updated successfully.',
      order: {
        id: orderId,
        delivery_status: newDeliveryStatus,
        status: overallStatus,
        current_location: newLocation,
        estimated_delivery: newEstimated,
        delivery_date: deliveryDate
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order delivery status.' });
  }
});

module.exports = router;
