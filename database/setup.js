const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'medical.db');
let db = null;
let SQL = null;

function ensureDbDirectoryExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveDb() {
  if (db) {
    ensureDbDirectoryExists();
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
    CREATE TABLE IF NOT EXISTS medicine_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
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
  db.run('CREATE INDEX IF NOT EXISTS idx_medicine_views_user ON medicine_views(user_id, created_at)');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bdmedical.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = db.exec('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existing.length === 0 || existing[0].values.length === 0) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Admin', adminEmail, hash, 'admin']);
    saveDb();
    console.log(`Admin account created: ${adminEmail}`);
  }

  const deliveryEmail = process.env.DELIVERY_EMAIL || 'delivery@bdmedical.com';
  const deliveryPassword = process.env.DELIVERY_PASSWORD || 'delivery123';
  const existingDelivery = db.exec('SELECT id FROM users WHERE email = ?', [deliveryEmail]);
  if (existingDelivery.length === 0 || existingDelivery[0].values.length === 0) {
    const hash = bcrypt.hashSync(deliveryPassword, 10);
    db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Delivery Man', deliveryEmail, hash, 'delivery_man']);
    saveDb();
    console.log(`Default Delivery Man account created: ${deliveryEmail}`);
  }

  const medCheck = db.exec('SELECT COUNT(*) FROM medicines');
  const medCount = (medCheck.length > 0 && medCheck[0].values.length > 0) ? medCheck[0].values[0][0] : 0;
  if (medCount === 0) {
    seedDefaultData(db);
  }

  console.log('Database initialized successfully');
}

function seedDefaultData(db) {
  const medicines = [
    { name: 'Napa', generic_name: 'Paracetamol (Acetaminophen)', uses: 'Relief of mild to moderate pain including headache, toothache, muscle pain, and reduction of fever.', dosage: 'Adults: 500mg-1000mg every 4-6 hours. Maximum 4g per day.', side_effects: 'Nausea, allergic reactions (rare).', warnings: 'Do not exceed recommended dose.', category: 'Pain Relief', price: 12.00, stock: 100 },
    { name: 'Seclo', generic_name: 'Omeprazole', uses: 'Treatment of gastric and duodenal ulcers, GERD.', dosage: 'Adults: 20mg once daily before breakfast for 4-8 weeks.', side_effects: 'Headache, nausea, diarrhea, abdominal pain.', warnings: 'Long-term use may cause vitamin B12 deficiency.', category: 'Gastric', price: 60.00, stock: 100 },
    { name: 'Azimax', generic_name: 'Azithromycin', uses: 'Treatment of respiratory tract infections, skin infections, ear infections.', dosage: 'Adults: 500mg daily for 3-5 days.', side_effects: 'Diarrhea, nausea, abdominal pain.', warnings: 'Complete full course of antibiotics.', category: 'Antibiotic', price: 175.00, stock: 100 },
    { name: 'Losectil', generic_name: 'Esomeprazole', uses: 'Treatment of GERD and peptic ulcer disease.', dosage: 'Adults: 20-40mg once daily.', side_effects: 'Headache, diarrhea, nausea.', warnings: 'Use lowest effective dose.', category: 'Gastric', price: 70.00, stock: 100 },
    { name: 'Ace Plus', generic_name: 'Paracetamol + Caffeine', uses: 'Relief of headache, migraine, muscle pain.', dosage: 'Adults: 1-2 tablets every 4-6 hours as needed.', side_effects: 'Insomnia, nervousness, nausea.', warnings: 'Contains caffeine.', category: 'Pain Relief', price: 30.00, stock: 100 },
    { name: 'Sergel', generic_name: 'Esomeprazole', uses: 'Treatment of acid reflux, GERD, peptic ulcer.', dosage: 'Adults: 20-40mg once daily before meal.', side_effects: 'Headache, abdominal pain, diarrhea.', warnings: 'Monitor magnesium levels.', category: 'Gastric', price: 70.00, stock: 100 },
    { name: 'Zimax', generic_name: 'Azithromycin', uses: 'Bacterial infections of the lungs, sinuses, throat.', dosage: 'Adults: 500mg once daily for 3 days.', side_effects: 'Stomach upset, diarrhea.', warnings: 'Take 1 hour before or 2 hours after meals.', category: 'Antibiotic', price: 180.00, stock: 100 },
    { name: 'Monas', generic_name: 'Montelukast', uses: 'Prevention and long-term treatment of asthma and allergic rhinitis.', dosage: 'Adults: 10mg once daily in the evening.', side_effects: 'Headache, abdominal pain.', warnings: 'Not for acute asthma attacks.', category: 'Respiratory', price: 160.00, stock: 100 },
    { name: 'Fenobid', generic_name: 'Fenofibrate', uses: 'Treatment of high cholesterol and triglycerides.', dosage: 'Adults: 160mg once daily with food.', side_effects: 'Stomach pain, nausea.', warnings: 'Monitor liver function tests.', category: 'Cardiovascular', price: 120.00, stock: 100 },
    { name: 'Losartan', generic_name: 'Losartan Potassium', uses: 'Treatment of hypertension and diabetic nephropathy.', dosage: 'Adults: Start 50mg once daily.', side_effects: 'Dizziness, fatigue, hypotension.', warnings: 'Do not use during pregnancy.', category: 'Cardiovascular', price: 90.00, stock: 100 },
    { name: 'Ciprocin', generic_name: 'Ciprofloxacin', uses: 'Treatment of urinary tract infections, respiratory infections.', dosage: 'Adults: 250-750mg twice daily.', side_effects: 'Nausea, diarrhea, dizziness.', warnings: 'May cause tendon rupture.', category: 'Antibiotic', price: 140.00, stock: 100 },
    { name: 'Algin', generic_name: 'Antacid (Alginate)', uses: 'Relief of heartburn and acid indigestion.', dosage: 'Adults: 10-20ml after meals and at bedtime.', side_effects: 'Constipation, bloating.', warnings: 'Contains sodium.', category: 'Gastric', price: 85.00, stock: 100 },
    { name: 'Amoxil', generic_name: 'Amoxicillin', uses: 'Treatment of bacterial infections including ear, nose, throat.', dosage: 'Adults: 250-500mg every 8 hours.', side_effects: 'Diarrhea, nausea, skin rash.', warnings: 'Inform doctor of penicillin allergy.', category: 'Antibiotic', price: 50.00, stock: 100 },
    { name: 'Amlodipine', generic_name: 'Amlodipine Besylate', uses: 'Treatment of high blood pressure and chest pain.', dosage: 'Adults: Start 5mg once daily.', side_effects: 'Edema, headache, fatigue.', warnings: 'Monitor blood pressure regularly.', category: 'Cardiovascular', price: 45.00, stock: 100 },
    { name: 'Histacin', generic_name: 'Chlorpheniramine Maleate', uses: 'Relief of allergic rhinitis and hay fever.', dosage: 'Adults: 4mg every 4-6 hours.', side_effects: 'Drowsiness, dry mouth.', warnings: 'Causes drowsiness - avoid driving.', category: 'Allergy', price: 15.00, stock: 100 },
    { name: 'Metformin', generic_name: 'Metformin Hydrochloride', uses: 'Treatment for type 2 diabetes mellitus.', dosage: 'Adults: Start 500mg twice daily with meals.', side_effects: 'Nausea, diarrhea, stomach pain.', warnings: 'Monitor kidney function.', category: 'Diabetes', price: 55.00, stock: 100 },
    { name: 'Orcef', generic_name: 'Cefixime', uses: 'Treatment of gonorrhea, tonsillitis, urinary tract infections.', dosage: 'Adults: 400mg daily as single dose.', side_effects: 'Diarrhea, nausea, headache.', warnings: 'Inform doctor of cephalosporin allergy.', category: 'Antibiotic', price: 210.00, stock: 100 },
    { name: 'Calcium-D', generic_name: 'Calcium Carbonate + Vitamin D3', uses: 'Prevention and treatment of calcium deficiency.', dosage: 'Adults: 1-2 tablets daily with meals.', side_effects: 'Constipation, bloating.', warnings: 'Do not exceed recommended dose.', category: 'Vitamins', price: 95.00, stock: 100 }
  ];

  for (const m of medicines) {
    db.run(
      'INSERT INTO medicines (name, generic_name, uses, dosage, side_effects, warnings, category, price, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [m.name, m.generic_name, m.uses, m.dosage, m.side_effects, m.warnings, m.category, m.price, m.stock]
    );
  }

  const doctors = [
    { name: 'Dr. Mohammad Rafiqul Islam', hospital: 'Dhaka Medical College Hospital', specialty: 'Cardiology', location: 'Dhaka', contact: '+880-2-55165001', email: 'rafiqul.islam@dmch.gov.bd' },
    { name: 'Dr. Fatema Khatun', hospital: 'Square Hospital', specialty: 'Neurology', location: 'Dhaka', contact: '+880-2-8159457', email: 'fatema.k@squarehospital.com' },
    { name: 'Dr. Abdul Karim Sarker', hospital: 'Chittagong Medical College Hospital', specialty: 'Orthopedics', location: 'Chittagong', contact: '+880-31-630335', email: 'karim.sarker@cmch.gov.bd' },
    { name: 'Dr. Nasreen Sultana', hospital: 'United Hospital', specialty: 'Gynecology', location: 'Dhaka', contact: '+880-2-8431661', email: 'nasreen.s@uhlbd.com' },
    { name: 'Dr. Md. Shahinul Alam', hospital: 'Bangabandhu Sheikh Mujib Medical University', specialty: 'Gastroenterology', location: 'Dhaka', contact: '+880-2-8614001', email: 'shahinul@bsmmu.edu.bd' },
    { name: 'Dr. Tahmina Begum', hospital: 'Evercare Hospital', specialty: 'Pediatrics', location: 'Dhaka', contact: '+880-2-8431661', email: 'tahmina.b@evercarebd.com' },
    { name: 'Dr. Rezaul Haque', hospital: 'Rajshahi Medical College Hospital', specialty: 'Dermatology', location: 'Rajshahi', contact: '+880-721-772150', email: 'rezaul.h@rmch.gov.bd' },
    { name: 'Dr. Sharmin Akhter', hospital: 'Ibn Sina Hospital', specialty: 'Ophthalmology', location: 'Dhaka', contact: '+880-2-9116551', email: 'sharmin.a@ibnsinabd.com' },
    { name: 'Dr. Kamrul Hassan', hospital: 'Sylhet MAG Osmani Medical College', specialty: 'ENT', location: 'Sylhet', contact: '+880-821-716981', email: 'kamrul.h@somch.gov.bd' },
    { name: 'Dr. Salma Rahman', hospital: 'Popular Medical College Hospital', specialty: 'Endocrinology', location: 'Dhaka', contact: '+880-2-9116551', email: 'salma.r@popularbd.com' }
  ];

  for (const d of doctors) {
    db.run(
      'INSERT INTO doctors (name, hospital, specialty, location, contact, email, rating, review_count, consultation_fee) VALUES (?, ?, ?, ?, ?, ?, 4.8, 12, 500)',
      [d.name, d.hospital, d.specialty, d.location, d.contact, d.email]
    );
  }

  const diseases = [
    { name: 'Diabetes Mellitus', category: 'Endocrine', overview: 'Chronic disease affecting blood glucose regulation.', causes: 'Genetic factors, obesity, sedentary lifestyle.', symptoms: 'Increased thirst, frequent urination, fatigue, blurred vision.', risk_factors: 'Family history, age, obesity.', diagnosis: 'Fasting blood glucose, HbA1c.', treatment: 'Lifestyle modifications, metformin, insulin.', prevention: 'Healthy diet, regular exercise.', related_specialties: 'Endocrinology, Internal Medicine' },
    { name: 'Hypertension', category: 'Cardiovascular', overview: 'Elevated blood pressure affecting cardiovascular health.', causes: 'Obesity, excessive sodium, stress.', symptoms: 'Headaches, dizziness, chest pain.', risk_factors: 'Age, obesity, sedentary lifestyle.', diagnosis: 'Blood pressure measurement, ECG.', treatment: 'Lifestyle changes, antihypertensives.', prevention: 'Reduce sodium intake, regular exercise.', related_specialties: 'Cardiology, Internal Medicine' },
    { name: 'Asthma', category: 'Respiratory', overview: 'Chronic inflammatory disease of airways.', causes: 'Allergies, air pollution, respiratory infections.', symptoms: 'Wheezing, shortness of breath, coughing.', risk_factors: 'Family history, allergies.', diagnosis: 'Spirometry, peak flow measurement.', treatment: 'Inhalers, corticosteroids.', prevention: 'Avoid triggers, maintain healthy weight.', related_specialties: 'Pulmonology, Internal Medicine' },
    { name: 'GERD', category: 'Gastric', overview: 'Chronic acid reflux disease.', causes: 'Weak lower esophageal sphincter, obesity.', symptoms: 'Heartburn, regurgitation, chest pain.', risk_factors: 'Obesity, smoking, alcohol.', diagnosis: 'Endoscopy, pH monitoring.', treatment: 'Proton pump inhibitors, antacids.', prevention: 'Avoid trigger foods, smaller meals.', related_specialties: 'Gastroenterology, Internal Medicine' }
  ];

  for (const dis of diseases) {
    db.run(
      'INSERT INTO diseases (name, category, overview, causes, symptoms, risk_factors, diagnosis, treatment, prevention, related_specialties) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [dis.name, dis.category, dis.overview, dis.causes, dis.symptoms, dis.risk_factors, dis.diagnosis, dis.treatment, dis.prevention, dis.related_specialties]
    );
  }

  const guidelines = [
    { title: 'Management of Hypertension in Adults', description: 'Evidence-based guidelines for screening, diagnosis, and treatment of hypertension.', type: 'national', category: 'Cardiovascular', authority: 'BMDC', publication_date: '2020-01-15', link: 'https://bmdc.org.bd' },
    { title: 'Diabetes Prevention and Management', description: 'Comprehensive guidelines for prevention and management of diabetes.', type: 'international', category: 'Endocrine', authority: 'WHO', publication_date: '2021-06-10', link: 'https://who.int' }
  ];

  for (const g of guidelines) {
    db.run(
      'INSERT INTO guidelines (title, description, type, category, authority, publication_date, link) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [g.title, g.description, g.type, g.category, g.authority, g.publication_date, g.link]
    );
  }

  const investigations = [
    { name: 'Dhaka Diagnostic Center', location: 'Dhanmondi', address: '456 Satmasjid Road, Dhanmondi, Dhaka', available_tests: 'Blood tests, ECG, Ultrasound, CT scan, MRI, X-ray', contact: '+880-2-9666999', opening_hours: 'Monday-Sunday: 8 AM - 8 PM' },
    { name: 'LabCare Bangladesh', location: 'Gulshan', address: '78 Gulshan Avenue, Gulshan 2, Dhaka', available_tests: 'Complete blood count, Biochemistry, Hormone tests', contact: '+880-2-9858585', opening_hours: 'Monday-Sunday: 7 AM - 9 PM' }
  ];

  for (const inv of investigations) {
    db.run(
      'INSERT INTO investigation_centers (name, location, address, available_tests, contact, opening_hours) VALUES (?, ?, ?, ?, ?, ?)',
      [inv.name, inv.location, inv.address, inv.available_tests, inv.contact, inv.opening_hours]
    );
  }

  saveDb();
  console.log('Seeded default medicines, doctors, diseases, guidelines, and investigation centers successfully!');
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
  if (!names.includes('delivery_person_id')) {
    db.run('ALTER TABLE orders ADD COLUMN delivery_person_id INTEGER');
  }
}

function runQuery(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDb();
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
