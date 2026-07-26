const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'medical.db');
let db = null;
let SQL = null;

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function getDb() {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  setInterval(saveDb, 5000);
  process.on('exit', saveDb);
  process.on('SIGINT', () => { saveDb(); setTimeout(() => process.exit(), 100); });

  return db;
}

async function initDatabase() {
  const db = await getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      blood_group TEXT,
      allergies TEXT,
      disabilities TEXT,
      organ_donor INTEGER DEFAULT 0,
      chronic_diseases TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      generic_name TEXT NOT NULL,
      uses TEXT NOT NULL,
      dosage TEXT NOT NULL,
      side_effects TEXT NOT NULL,
      warnings TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      price REAL DEFAULT 0,
      stock INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hospital TEXT NOT NULL,
      specialty TEXT NOT NULL,
      location TEXT NOT NULL,
      contact TEXT NOT NULL,
      email TEXT,
      image_url TEXT,
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      consultation_fee REAL DEFAULT 500,
      available_from TEXT DEFAULT '09:00',
      available_to TEXT DEFAULT '17:00',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, doctor_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, doctor_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS diseases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      overview TEXT NOT NULL,
      causes TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      risk_factors TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      treatment TEXT NOT NULL,
      prevention TEXT NOT NULL,
      related_specialties TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS guidelines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'national',
      category TEXT NOT NULL DEFAULT 'General',
      authority TEXT NOT NULL,
      publication_date TEXT,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS investigation_centers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      address TEXT NOT NULL,
      available_tests TEXT NOT NULL,
      contact TEXT NOT NULL,
      opening_hours TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, medicine_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      shipping_name TEXT NOT NULL,
      shipping_phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      tracking_number TEXT,
      delivery_date TEXT,
      estimated_delivery TEXT,
      current_location TEXT,
      delivery_status TEXT DEFAULT 'pending',
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      medicine_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS medicine_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      reminder_time TEXT NOT NULL,
      days_of_week TEXT DEFAULT 'daily',
      is_active INTEGER DEFAULT 1,
      last_notified DATETIME,
      snoozed_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'scheduled',
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  migrateUserMedicalInfo(db);
  migrateDoctorFees(db);
  migrateMedicinePrices(db);
  migrateCancellationReason(db);
  migrateDeliveryTracking(db);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bdmedical.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = db.exec('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existing.length === 0 || existing[0].values.length === 0) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Admin', adminEmail, hash, 'admin']);
    saveDb();
    console.log(`Admin account created: ${adminEmail}`);
  }

  console.log('Database initialized successfully');
}

// Add medical info columns to users table for existing databases
function migrateUserMedicalInfo(db) {
  const columns = db.exec('PRAGMA table_info(users)');
  const names = columns.length > 0 ? columns[0].values.map(c => c[1]) : [];

  if (!names.includes('blood_group')) {
    db.run('ALTER TABLE users ADD COLUMN blood_group TEXT');
  }
  if (!names.includes('allergies')) {
    db.run('ALTER TABLE users ADD COLUMN allergies TEXT');
  }
  if (!names.includes('disabilities')) {
    db.run('ALTER TABLE users ADD COLUMN disabilities TEXT');
  }
  if (!names.includes('organ_donor')) {
    db.run('ALTER TABLE users ADD COLUMN organ_donor INTEGER DEFAULT 0');
  }
  if (!names.includes('chronic_diseases')) {
    db.run('ALTER TABLE users ADD COLUMN chronic_diseases TEXT');
  }
}

// Add doctor fees and availability columns for existing databases
function migrateDoctorFees(db) {
  const columns = db.exec('PRAGMA table_info(doctors)');
  const names = columns.length > 0 ? columns[0].values.map(c => c[1]) : [];

  if (!names.includes('consultation_fee')) {
    db.run('ALTER TABLE doctors ADD COLUMN consultation_fee REAL DEFAULT 500');
  }
  if (!names.includes('available_from')) {
    db.run('ALTER TABLE doctors ADD COLUMN available_from TEXT DEFAULT "09:00"');
  }
  if (!names.includes('available_to')) {
    db.run('ALTER TABLE doctors ADD COLUMN available_to TEXT DEFAULT "17:00"');
  }
}

// Older databases were created before the e-pharmacy module existed, so the
// medicines table may lack price/stock columns and have no prices set.
function migrateMedicinePrices(db) {
  const columns = db.exec('PRAGMA table_info(medicines)');
  const names = columns.length > 0 ? columns[0].values.map(c => c[1]) : [];

  if (!names.includes('price')) {
    db.run('ALTER TABLE medicines ADD COLUMN price REAL DEFAULT 0');
  }
  if (!names.includes('stock')) {
    db.run('ALTER TABLE medicines ADD COLUMN stock INTEGER DEFAULT 100');
  }

  const basePrices = {
    'Pain Relief': 2, 'Gastric': 5, 'Antibiotic': 12, 'Respiratory': 8,
    'Cardiovascular': 10, 'Allergy': 3, 'Diabetes': 7, 'Vitamins': 4
  };
  const unpriced = db.exec('SELECT id, category FROM medicines WHERE price IS NULL OR price <= 0');
  if (unpriced.length > 0) {
    unpriced[0].values.forEach(([id, category]) => {
      const base = basePrices[category] || 6;
      const price = Math.round((base + (id % 7) * 1.5) * 100) / 100;
      db.run('UPDATE medicines SET price = ?, stock = COALESCE(stock, 100) WHERE id = ?', [price, id]);
    });
    saveDb();
    console.log(`Assigned prices to ${unpriced[0].values.length} medicines`);
  }
}

// Add cancellation reason column to appointments table for existing databases
function migrateCancellationReason(db) {
  const columns = db.exec('PRAGMA table_info(appointments)');
  const names = columns.length > 0 ? columns[0].values.map(c => c[1]) : [];

  if (!names.includes('cancellation_reason')) {
    db.run('ALTER TABLE appointments ADD COLUMN cancellation_reason TEXT');
  }
}

// Add delivery tracking columns to orders table for existing databases
function migrateDeliveryTracking(db) {
  const columns = db.exec('PRAGMA table_info(orders)');
  const names = columns.length > 0 ? columns[0].values.map(c => c[1]) : [];

  if (!names.includes('tracking_number')) {
    db.run('ALTER TABLE orders ADD COLUMN tracking_number TEXT');
  }
  if (!names.includes('delivery_date')) {
    db.run('ALTER TABLE orders ADD COLUMN delivery_date TEXT');
  }
  if (!names.includes('estimated_delivery')) {
    db.run('ALTER TABLE orders ADD COLUMN estimated_delivery TEXT');
  }
  if (!names.includes('current_location')) {
    db.run('ALTER TABLE orders ADD COLUMN current_location TEXT');
  }
  if (!names.includes('delivery_status')) {
    db.run('ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT "pending"');
  }
  if (!names.includes('cancellation_reason')) {
    db.run('ALTER TABLE orders ADD COLUMN cancellation_reason TEXT');
  }
  if (!names.includes('updated_at')) {
    db.run('ALTER TABLE orders ADD COLUMN updated_at DATETIME');
  }
}

function runQuery(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
}

function getOne(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getAll(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function getLastInsertId() {
  if (!db) throw new Error('Database not initialized');
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0].values[0][0];
}

function getChanges() {
  if (!db) throw new Error('Database not initialized');
  const result = db.exec('SELECT changes() as count');
  return result[0].values[0][0];
}

module.exports = { getDb, initDatabase, runQuery, getOne, getAll, getLastInsertId, getChanges, saveDb };
