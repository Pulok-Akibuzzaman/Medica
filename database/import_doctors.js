// Imports the real Bangladeshi doctor directory (doctors_combined_data.csv,
// scraped doctor listings) into the `doctors` table, replacing the small set
// of placeholder doctors seeded before.
//
// doctors_combined_data.csv holds one row per doctor listing: Doctor Name,
// Education, Speciality, Experience, Chamber, Location, Concentration. The
// scraper split "Chamber, Location" oddly — e.g. Chamber ends up as
// "Aalok Healthcare Ltd. | Mirpur 10" and Location as " Dhaka-1216" — so we
// recombine them into hospital + a readable location string.
const fs = require('fs');
const path = require('path');
const { initDatabase, runQuery, saveDb, getDb } = require('./setup');

const DOCTORS_CSV = path.join(__dirname, 'doctors_combined_data.csv');

function stripBOM(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Parses a full CSV file's text into rows, honoring quoted fields that
// contain commas, escaped quotes (""), and embedded newlines.
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

// Splits "Aalok Healthcare Ltd. | Mirpur 10" + " Dhaka-1216" into a hospital
// name and a combined, readable location string.
function splitChamber(chamber, location) {
  const cleanLocation = (location || '').trim();
  const pipeIndex = chamber.indexOf('|');
  if (pipeIndex === -1) {
    return {
      hospital: chamber.trim() || 'Not specified',
      location: cleanLocation || 'Dhaka',
    };
  }
  const hospital = chamber.slice(0, pipeIndex).trim() || 'Not specified';
  const area = chamber.slice(pipeIndex + 1).trim();
  const location2 = [area, cleanLocation].filter(Boolean).join(', ') || 'Dhaka';
  return { hospital, location: location2 };
}

async function importDoctors() {
  await initDatabase();

  if (!fs.existsSync(DOCTORS_CSV)) {
    console.error('doctors_combined_data.csv not found in database/');
    process.exit(1);
  }

  console.log('Reading doctors_combined_data.csv...');
  const rows = readCSV(DOCTORS_CSV);
  console.log(`Loaded ${rows.length} doctor listing(s).`);

  const db = await getDb();

  runQuery('DELETE FROM favorites');
  runQuery('DELETE FROM reviews');
  runQuery('DELETE FROM appointments');
  runQuery('DELETE FROM doctors');

  db.run('BEGIN TRANSACTION');

  const seen = new Set();
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const row of rows) {
    const name = (row['Doctor Name'] || '').trim();
    const specialty = (row['Speciality'] || '').trim();
    if (!name || !specialty) { skipped++; continue; }

    // Drop exact repeat listings (same scraped row appearing more than
    // once); doctors that share a name but differ in chamber/specialty are
    // kept, since Bangladeshi directories commonly have distinct doctors
    // with the same name.
    const dedupeKey = [name, specialty, row['Chamber'], row['Location'], row['Experience']].join('|');
    if (seen.has(dedupeKey)) { duplicates++; continue; }
    seen.add(dedupeKey);

    const { hospital, location } = splitChamber(row['Chamber'] || '', row['Location'] || '');
    const contact = 'Contact via hospital reception desk';

    runQuery(
      'INSERT INTO doctors (name, hospital, specialty, location, contact, email) VALUES (?, ?, ?, ?, ?, ?)',
      [name, hospital, specialty, location, contact, null]
    );
    imported++;
    if (imported % 2000 === 0) console.log(`  imported ${imported}...`);
  }

  db.run('COMMIT');
  saveDb();

  console.log(`Imported ${imported} doctor(s). Skipped ${skipped} row(s) missing a name/specialty, ${duplicates} exact duplicate(s).`);
  process.exit(0);
}

importDoctors().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
