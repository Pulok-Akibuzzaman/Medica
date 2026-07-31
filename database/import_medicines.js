const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { initDatabase, runQuery, getOne, saveDb } = require('./setup');

const CSV_PATH = path.join(__dirname, 'medicines.csv');

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function normalizeHeader(h) {
  if (!h) return '';
  // remove BOM, trim, lowercase, replace non-alphanum with underscore
  const noBOM = h.charCodeAt(0) === 0xfeff ? h.slice(1) : h;
  return noBOM.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function mapRowByHeaders(headers, cols) {
  const mapped = {};
  for (let i = 0; i < headers.length; i++) {
    mapped[headers[i]] = cols[i] !== undefined ? cols[i] : '';
  }
  return mapped;
}

function isUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s.trim());
}

function isPrice(s) {
  return typeof s === 'string' && /₹|mrp|\d+\.?\d*/i.test(s);
}

function inferNameFromCols(cols) {
  // Prefer the third column if present (observed in sample), otherwise pick the first non-URL, non-price, reasonably long value
  if (cols[2] && typeof cols[2] === 'string' && !isUrl(cols[2]) && !isPrice(cols[2]) && cols[2].trim().length > 2) return cols[2].trim();
  for (let i = 0; i < cols.length; i++) {
    const c = (cols[i] || '').toString().trim();
    if (!c) continue;
    if (isUrl(c) || isPrice(c)) continue;
    if (c.length < 3) continue;
    return c;
  }
  return '';
}

async function importMedicines() {
  await initDatabase();

  if (!fs.existsSync(CSV_PATH)) {
    console.error('medicines.csv not found at', CSV_PATH);
    process.exit(1);
  }

  const rl = readline.createInterface({ input: fs.createReadStream(CSV_PATH) });
  let isHeader = true;
  let headers = [];
  let imported = 0;

  let totalRows = 0;
  let skipped = 0;
  const candidateCounts = {};
  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isHeader) {
      headers = parseCSVLine(line).map(h => normalizeHeader(h));
      console.log('Detected headers:', headers.join(', '));
      isHeader = false;
      continue;
    }
    totalRows++;
    const cols = parseCSVLine(line);
    if (cols.length === 0) {
      skipped++;
      continue;
    }
    const mapped = mapRowByHeaders(headers, cols);

    // Find name using common header variants, otherwise infer from columns
    let name = mapped.name || mapped.medicine || mapped.med_name || mapped.medicine_name || mapped['medicine_name'] || mapped['drug_name'] || mapped['drug'] || '';
    // prefer generic name if med_name missing
    if (!name && (mapped.generic_name || mapped.generic)) {
      name = mapped.generic_name || mapped.generic;
    }
    if (!name) {
      name = inferNameFromCols(cols);
      if (name && totalRows <= 5) console.log('Inferred name from columns:', name);
    }

    // Normalize name
    const normName = (name || '').toString().trim();
    if (normName) candidateCounts[normName] = (candidateCounts[normName] || 0) + 1;
    if (!name) {
      skipped++;
      if (totalRows <= 5) console.log('Skipping row (no name found):', cols.slice(0, 6));
      continue;
    }

    const exists = getOne('SELECT id FROM medicines WHERE name = ?', [name]);
    if (!exists) {
      const generic = mapped.generic || mapped.generic_name || mapped['generic_name'] || '';
      const uses = mapped.uses || '';
      const dosage = mapped.dosage || '';
      const side_effects = mapped.side_effects || mapped.side_effect || mapped.sideeffects || '';
      const warnings = mapped.warnings || '';
      const category = mapped.category || 'General';

      runQuery(
        'INSERT INTO medicines (name, generic_name, uses, dosage, side_effects, warnings, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, generic, uses, dosage, side_effects, warnings, category]
      );
      imported++;
    }
  }

  saveDb();
  const uniqueCandidates = Object.keys(candidateCounts).length;
  // top 10 most frequent candidate names
  const top = Object.entries(candidateCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`Processed ${totalRows} row(s), skipped ${skipped} row(s).`);
  console.log(`Found ${uniqueCandidates} unique candidate medicine names in CSV.`);
  console.log('Top 10 candidate names and counts:');
  top.forEach(([n, c]) => console.log(`  ${c} × ${n}`));
  console.log(`Imported ${imported} new medicine(s) from medicines.csv`);
  process.exit(0);
}

importMedicines().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
