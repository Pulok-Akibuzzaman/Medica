require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./database/setup');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Create a .env file in the project root with JWT_SECRET=<any-long-random-string> (see README).');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

async function start() {
  await initDatabase();

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/medicines', require('./routes/medicines'));
  app.use('/api/doctors', require('./routes/doctors'));
  app.use('/api/chat', require('./routes/chat'));
  app.use('/api/favorites', require('./routes/favorites'));
  app.use('/api/reviews', require('./routes/reviews'));
  app.use('/api/diseases', require('./routes/diseases'));
  app.use('/api/guidelines', require('./routes/guidelines'));
  app.use('/api/investigations', require('./routes/investigations'));
  app.use('/api/cart', require('./routes/cart'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/reminders', require('./routes/reminders'));
  app.use('/api/appointments', require('./routes/appointments'));

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found.' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
