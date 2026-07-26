const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll, getLastInsertId } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

// Get all appointments for logged-in user
router.get('/', authenticateToken, (req, res) => {
  try {
    const appointments = getAll(
      'SELECT a.*, d.name as doctor_name, d.specialty, d.hospital, d.contact, d.consultation_fee FROM appointments a JOIN doctors d ON a.doctor_id = d.id WHERE a.user_id = ? ORDER BY a.appointment_date DESC, a.appointment_time DESC',
      [req.user.id]
    );
    res.json({ appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Get available time slots for a doctor on a specific date
router.get('/slots/:doctorId/:date', authenticateToken, (req, res) => {
  try {
    const { doctorId, date } = req.params;

    // Get all booked appointments for this doctor on this date
    const booked = getAll(
      'SELECT appointment_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status != ?',
      [doctorId, date, 'cancelled']
    );

    const bookedTimes = booked.map(b => b.appointment_time);

    // Generate available slots (9 AM to 5 PM, 30-minute intervals)
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        if (!bookedTimes.includes(time)) {
          slots.push(time);
        }
      }
    }

    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch available slots.' });
  }
});

// Book an appointment
router.post('/', authenticateToken, (req, res) => {
  try {
    const { doctor_id, appointment_date, appointment_time, reason } = req.body;

    if (!doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'Doctor ID, date, and time are required.' });
    }

    // Check if slot is still available
    const existing = getOne(
      'SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != ?',
      [doctor_id, appointment_date, appointment_time, 'cancelled']
    );

    if (existing) {
      return res.status(409).json({ error: 'This time slot is already booked.' });
    }

    runQuery(
      'INSERT INTO appointments (user_id, doctor_id, appointment_date, appointment_time, reason, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, doctor_id, appointment_date, appointment_time, reason || '', 'scheduled']
    );

    const id = getLastInsertId();
    const appointment = getOne(
      'SELECT a.*, d.name as doctor_name, d.specialty, d.hospital FROM appointments a JOIN doctors d ON a.doctor_id = d.id WHERE a.id = ?',
      [id]
    );

    res.status(201).json({ message: 'Appointment booked successfully!', appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to book appointment.' });
  }
});

// Cancel an appointment
router.put('/:id/cancel', authenticateToken, (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { cancellation_reason } = req.body;

    const appointment = getOne(
      'SELECT * FROM appointments WHERE id = ? AND user_id = ?',
      [appointmentId, req.user.id]
    );

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled.' });
    }

    runQuery(
      'UPDATE appointments SET status = ?, cancellation_reason = ? WHERE id = ?',
      ['cancelled', cancellation_reason || '', appointmentId]
    );

    res.json({ message: 'Appointment cancelled successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

// Reschedule an appointment
router.put('/:id/reschedule', authenticateToken, (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { appointment_date, appointment_time } = req.body;

    if (!appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'Date and time are required.' });
    }

    const appointment = getOne(
      'SELECT * FROM appointments WHERE id = ? AND user_id = ?',
      [appointmentId, req.user.id]
    );

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check if new slot is available
    const conflict = getOne(
      'SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND id != ? AND status != ?',
      [appointment.doctor_id, appointment_date, appointment_time, appointmentId, 'cancelled']
    );

    if (conflict) {
      return res.status(409).json({ error: 'This time slot is already booked.' });
    }

    runQuery(
      'UPDATE appointments SET appointment_date = ?, appointment_time = ? WHERE id = ?',
      [appointment_date, appointment_time, appointmentId]
    );

    res.json({ message: 'Appointment rescheduled successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reschedule appointment.' });
  }
});

module.exports = router;
