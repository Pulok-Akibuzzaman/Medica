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

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bdmedical.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = db.exec(`SELECT id FROM users WHERE email = '${adminEmail.replace(/'/g, "''")}'`);
  if (existing.length === 0 || existing[0].values.length === 0) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Admin', adminEmail, hash, 'admin']);
    saveDb();
    console.log(`Admin account created: ${adminEmail}`);
  }

  console.log('Database initialized successfully');
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
