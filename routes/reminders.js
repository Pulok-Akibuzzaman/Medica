const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getLastInsertId } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, (req, res) => {
  try {
    const reminders = getAll(
      'SELECT * FROM medicine_reminders WHERE user_id = ? ORDER BY reminder_time ASC',
      [req.user.id]
    );
    res.json({ reminders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reminders.' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const { medicine_name, dosage, reminder_time, days_of_week } = req.body;

    if (!medicine_name || !reminder_time) {
      return res.status(400).json({ error: 'Medicine name and reminder time are required.' });
    }

    runQuery(
      'INSERT INTO medicine_reminders (user_id, medicine_name, dosage, reminder_time, days_of_week, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [req.user.id, medicine_name, dosage || '', days_of_week || 'daily', reminder_time]
    );

    const id = getLastInsertId();
    const reminder = getOne('SELECT * FROM medicine_reminders WHERE id = ?', [id]);

    res.json({ reminder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reminder.' });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { medicine_name, dosage, reminder_time, days_of_week, is_active } = req.body;
    const reminderId = parseInt(req.params.id);

    const reminder = getOne(
      'SELECT * FROM medicine_reminders WHERE id = ? AND user_id = ?',
      [reminderId, req.user.id]
    );

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found.' });
    }

    runQuery(
      'UPDATE medicine_reminders SET medicine_name = ?, dosage = ?, reminder_time = ?, days_of_week = ?, is_active = ? WHERE id = ?',
      [medicine_name || reminder.medicine_name, dosage || reminder.dosage, reminder_time || reminder.reminder_time, days_of_week || reminder.days_of_week, is_active !== undefined ? is_active : reminder.is_active, reminderId]
    );

    const updated = getOne('SELECT * FROM medicine_reminders WHERE id = ?', [reminderId]);
    res.json({ reminder: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update reminder.' });
  }
});

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const reminderId = parseInt(req.params.id);

    const reminder = getOne(
      'SELECT * FROM medicine_reminders WHERE id = ? AND user_id = ?',
      [reminderId, req.user.id]
    );

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found.' });
    }

    runQuery('DELETE FROM medicine_reminders WHERE id = ?', [reminderId]);

    res.json({ message: 'Reminder deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete reminder.' });
  }
});

router.post('/:id/snooze', authenticateToken, (req, res) => {
  try {
    const reminderId = parseInt(req.params.id);
    const { minutes = 10 } = req.body;

    const reminder = getOne(
      'SELECT * FROM medicine_reminders WHERE id = ? AND user_id = ?',
      [reminderId, req.user.id]
    );

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found.' });
    }

    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
    runQuery(
      'UPDATE medicine_reminders SET snoozed_until = ? WHERE id = ?',
      [snoozeUntil.toISOString(), reminderId]
    );

    res.json({ message: `Reminder snoozed for ${minutes} minutes.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to snooze reminder.' });
  }
});

router.post('/:id/acknowledge', authenticateToken, (req, res) => {
  try {
    const reminderId = parseInt(req.params.id);

    const reminder = getOne(
      'SELECT * FROM medicine_reminders WHERE id = ? AND user_id = ?',
      [reminderId, req.user.id]
    );

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found.' });
    }

    runQuery(
      'UPDATE medicine_reminders SET last_notified = ?, snoozed_until = NULL WHERE id = ?',
      [new Date().toISOString(), reminderId]
    );

    res.json({ message: 'Reminder acknowledged.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to acknowledge reminder.' });
  }
});

router.post('/:id/notify', authenticateToken, (req, res) => {
  try {
    const reminderId = parseInt(req.params.id);
    const { last_notified } = req.body;

    const reminder = getOne(
      'SELECT * FROM medicine_reminders WHERE id = ? AND user_id = ?',
      [reminderId, req.user.id]
    );

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found.' });
    }

    runQuery(
      'UPDATE medicine_reminders SET last_notified = ? WHERE id = ?',
      [last_notified || new Date().toISOString(), reminderId]
    );

    res.json({ message: 'Reminder notification logged.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log reminder notification.' });
  }
});

module.exports = router;
