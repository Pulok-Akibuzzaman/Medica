// Imports the Kaggle "Disease Symptom Prediction" dataset
// (DiseaseAndSymptoms.csv + Disease precaution.csv) as new entries in the
// `diseases` table, alongside the existing hand-written articles.
//
// DiseaseAndSymptoms.csv is ML training data: many rows per disease, each
// listing a different subset of symptoms observed for that disease. We
// aggregate every row for a disease into the full set of symptoms ever
// listed for it. Disease precaution.csv adds up to 4 short precautions per
// disease, used as the `prevention` field.
//
// This dataset has no overview/causes/risk-factors/diagnosis/treatment text
// at all, so those required fields are filled with an explicit placeholder
// noting the data isn't available in this dataset — these 41 entries are
// intentionally lighter-weight than the curated articles already seeded.
const fs = require('fs');
const path = require('path');
const { initDatabase, runQuery, getOne, saveDb } = require('./setup');

const SYMPTOMS_CSV = path.join(__dirname, 'DiseaseAndSymptoms.csv');
const PRECAUTIONS_CSV = path.join(__dirname, 'Disease precaution.csv');

const NOT_AVAILABLE = 'Not available in this dataset; consult a physician for detailed clinical information.';

function stripBOM(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

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

// Dataset symptom/precaution values look like " dischromic _patches" —
// underscores instead of spaces, stray leading/inner spaces.
function cleanPhrase(text) {
  return (text || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(text) {
  return text.replace(/\b\w/g, c => c.toUpperCase());
}

async function importDiseases() {
  await initDatabase();

  if (!fs.existsSync(SYMPTOMS_CSV) || !fs.existsSync(PRECAUTIONS_CSV)) {
    console.error('DiseaseAndSymptoms.csv and/or Disease precaution.csv not found in database/');
    process.exit(1);
  }

  console.log('Reading DiseaseAndSymptoms.csv...');
  const symptomRows = readCSV(SYMPTOMS_CSV);
  const symptomsByDisease = new Map();
  for (const row of symptomRows) {
    const disease = (row['Disease'] || '').trim();
    if (!disease) continue;
    if (!symptomsByDisease.has(disease)) symptomsByDisease.set(disease, new Set());
    const set = symptomsByDisease.get(disease);
    Object.keys(row).forEach(key => {
      if (!key.startsWith('Symptom_')) return;
      const cleaned = cleanPhrase(row[key]);
      if (cleaned) set.add(cleaned);
    });
  }
  console.log(`Found ${symptomsByDisease.size} diseases with symptom data.`);

  console.log('Reading Disease precaution.csv...');
  const precautionRows = readCSV(PRECAUTIONS_CSV);
  const precautionsByDisease = new Map();
  for (const row of precautionRows) {
    const disease = (row['Disease'] || '').trim();
    if (!disease) continue;
    const list = Object.keys(row)
      .filter(k => k.startsWith('Precaution_'))
      .map(k => cleanPhrase(row[k]))
      .filter(Boolean);
    precautionsByDisease.set(disease, list);
  }

  let imported = 0;
  let skippedExisting = 0;

  for (const [disease, symptomSet] of symptomsByDisease) {
    const existing = getOne('SELECT id FROM diseases WHERE name = ?', [disease]);
    if (existing) { skippedExisting++; continue; }

    const symptoms = [...symptomSet].map(titleCase).join(', ') || NOT_AVAILABLE;
    const precautions = precautionsByDisease.get(disease) || [];
    const prevention = precautions.length
      ? precautions.map(titleCase).join('; ')
      : NOT_AVAILABLE;

    runQuery(
      `INSERT INTO diseases (name, category, overview, causes, symptoms, risk_factors, diagnosis, treatment, prevention, related_specialties)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [disease, 'General', NOT_AVAILABLE, NOT_AVAILABLE, symptoms, NOT_AVAILABLE, NOT_AVAILABLE, NOT_AVAILABLE, prevention, '']
    );
    imported++;
  }

  saveDb();

  console.log(`Imported ${imported} disease(s). Skipped ${skippedExisting} that already existed by exact name match.`);
}

if (require.main === module) {
  importDiseases().then(() => setTimeout(() => process.exit(0), 100)).catch(err => {
    console.error('Import failed:', err);
    setTimeout(() => process.exit(1), 100);
  });
}

module.exports = { importDiseases };
