// Imports the real Bangladesh medicine dataset (medicine.csv + generic.csv,
// scraped from medex.com.bd) into the `medicines` table, replacing whatever
// placeholder rows were seeded before.
//
// medicine.csv holds one row per brand/product (name, dosage form, strength,
// manufacturer, price). generic.csv holds one row per generic/active
// ingredient with the clinical detail (drug class, indications, dosage,
// side effects, contraindications, precautions, etc). We join the two on
// generic name so each brand gets real clinical text instead of placeholders.
const fs = require('fs');
const path = require('path');
const { initDatabase, runQuery, saveDb, getDb } = require('./setup');

const MEDICINE_CSV = path.join(__dirname, 'medicine.csv');
const GENERIC_CSV = path.join(__dirname, 'generic.csv');

function stripBOM(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Parses a full CSV file's text into rows, honoring quoted fields that
// contain commas, escaped quotes (""), and embedded newlines (generic.csv's
// description columns contain raw HTML with real line breaks inside quotes,
// so a line-by-line reader would split records in the wrong place).
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function readCSV(filePath) {
  const text = stripBOM(fs.readFileSync(filePath, 'utf8'));
  const rows = parseCSV(text).filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
  const headers = rows[0];
  return rows.slice(1).map(cols => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] !== undefined ? cols[i] : ''; });
    return obj;
  });
}

// generic.csv's long-text columns are raw HTML fragments. Convert them to
// short, clean plain text since the frontend renders these fields as-is.
function stripHtml(html) {
  if (!html) return '';
  return html
    // medex.com.bd embeds a hidden, truncated "preview" version of some
    // descriptions ending in a "... Read more" toggle, immediately followed
    // by the real full text in a separate <div class="full-str">. Drop the
    // hidden preview so we don't end up with the text duplicated.
    .replace(/<div class="min-str[^"]*"[^>]*>[\s\S]*?Read more/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
    .trim();
}

function truncate(text, max) {
  if (!text) return '';
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}

// package container looks like "100 ml bottle: ৳ 40.12" or
// "Unit Price: ৳ 5.98,(100's pack: ৳ 598.00)" — pull the first taka amount.
function extractPrice(packageContainer) {
  if (!packageContainer) return 0;
  const match = packageContainer.match(/৳\s*([\d,]+\.?\d*)/);
  if (!match) return 0;
  const value = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function importMedicines(targetDb) {
  if (!fs.existsSync(MEDICINE_CSV) || !fs.existsSync(GENERIC_CSV)) {
    console.error('medicine.csv and/or generic.csv not found in database/');
    return 0;
  }

  console.log('Reading generic.csv...');
  const generics = readCSV(GENERIC_CSV);
  const genericsByName = new Map();
  generics.forEach(g => {
    const key = (g['generic name'] || '').trim().toLowerCase();
    if (key) genericsByName.set(key, g);
  });
  console.log(`Loaded ${genericsByName.size} generics.`);

  console.log('Reading medicine.csv...');
  const brands = readCSV(MEDICINE_CSV);
  console.log(`Loaded ${brands.length} brand medicines.`);

  const db = targetDb;

  db.run('DELETE FROM cart_items');
  db.run('DELETE FROM medicines');

  db.run('BEGIN TRANSACTION');

  let imported = 0;
  let skipped = 0;

  for (const brand of brands) {
    const name = (brand['brand name'] || '').trim();
    const genericName = (brand['generic'] || '').trim();
    if (!name || !genericName) { skipped++; continue; }

    const g = genericsByName.get(genericName.toLowerCase()) || {};
    const category = (g['drug class'] || '').trim() || 'General';
    const indicationText = [g['indication'], stripHtml(g['indication description'])].filter(Boolean).join(' — ');
    const uses = truncate(indicationText, 700) || 'Consult product literature for indications.';
    const dosageForm = (brand['dosage form'] || '').trim();
    const strength = (brand['strength'] || '').trim();
    const dosageHeader = [dosageForm, strength].filter(Boolean).join(', ');
    const dosageBody = truncate(stripHtml(g['dosage description']), 600);
    const dosage = [dosageHeader, dosageBody].filter(Boolean).join('\n') || 'As directed by a physician.';
    const sideEffects = truncate(stripHtml(g['side effects description']), 700) || 'Not commonly reported; consult a physician.';
    const warningsParts = [stripHtml(g['contraindications description']), stripHtml(g['precautions description'])].filter(Boolean);
    const warnings = truncate(warningsParts.join('\n'), 900) || 'No specific warnings listed; use as directed by a physician.';
    const price = extractPrice(brand['package container']) || 20.00;

    db.run(
      'INSERT INTO medicines (name, generic_name, uses, dosage, side_effects, warnings, category, price, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, genericName, uses, dosage, sideEffects, warnings, category, price, 100]
    );
    imported++;
    if (imported % 5000 === 0) console.log(`  imported ${imported} medicines...`);
  }

  db.run('COMMIT');
  saveDb();

  console.log(`Imported ${imported} medicine(s) from CSV dataset.`);
  return imported;
}

if (require.main === module) {
  try {
    const { getDb } = require('./setup');
    getDb().then(db => {
      importMedicines(db);
      setTimeout(() => process.exit(0), 100);
    });
  } catch (err) {
    console.error('Import failed:', err);
    setTimeout(() => process.exit(1), 100);
  }
}

module.exports = { importMedicines };
