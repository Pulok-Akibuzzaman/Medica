const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

const DISCLAIMER = '\n\n⚠️ **Disclaimer:** This is not a medical diagnosis. Please consult a real doctor for proper medical advice.';

const GREETING_RE = /\b(hi|hello|hey|assalamu|salam|greetings)\b/;
const THANKS_RE = /\b(thank|thanks|dhonnobad|shukria)\b/;

// Basic questions about the bot itself — checked before the medical-topic
// gate so "what's your name" / "what is this" doesn't fall through to
// medicine-name scanning (a plain "what is X" pattern previously matched
// this and, worse, once matched the brand "Nameso" off the word "name").
const BOT_IDENTITY_RE = /\b(your name|who are you|what are you|what can you do|what do you do|how (do|can) you (help|work))\b/;

// Phrases that ask the bot to name a disease/condition outright rather than
// offer guidance — declined the same way regardless of what symptom words
// are also present in the message.
const DIAGNOSIS_REQUEST_RE = /\b(do i have|am i having|is this|could this be|does this mean i have|diagnose me|what disease do i have|what('?s| is) wrong with me)\b/;

// Red-flag symptom combinations that need an unambiguous "seek emergency
// care now" response instead of medicine suggestions or a specialist list —
// checked before anything else so nothing (including a matched medicine
// name) can push this response further down or crowd it out.
const EMERGENCY_RULES = [
  { re: /\bchest (pain|tight|pressure|discomfort)\b/, label: 'chest pain' },
  { re: /\b(can'?t|cannot|difficulty) breath(e|ing)\b|\bshortness of breath\b|\bstruggling to breathe\b/, label: 'severe breathing difficulty' },
  { re: /\b(severe|sudden|worst) headache\b.*\b(vision|confus|numb|slurr)/, label: 'possible stroke symptoms' },
  { re: /\b(face|arm|speech) (drooping|numb|slurred|weakness)\b|\bslurred speech\b/, label: 'possible stroke symptoms' },
  { re: /\bsuicid|self.?harm|kill myself\b/, label: 'a mental health crisis' },
  { re: /\bunconscious|not breathing|no pulse|severe bleeding|coughing (up )?blood\b/, label: 'a life-threatening emergency' }
];

// Non-medical small talk / off-topic requests get redirected instead of
// forced through symptom/medicine matching, which used to just fall through
// to "I don't understand" for anything that didn't contain a known keyword.
// "ache"/"pain" have no leading \b: they're meant to also match as a suffix
// ("headache", "backpain") — a leading \b would require them as whole words
// and silently miss "headache" (no word boundary between 'd' and 'a').
const MEDICAL_SIGNAL_RE = /(pain|ache)|\b(hurt|fever|cough|cold|flu|sick|ill|symptom|medicine|drug|tablet|capsule|syrup|dose|dosage|doctor|specialist|hospital|clinic|appointment|disease|condition|diagnos|treatment|guideline|test|investigation|scan|checkup|check-up|allerg|side effect|price|cost|prescri|health|blood|surgery|infection)\b/;

// "Tell me about X" / "what is X" phrasing signals a specific-item lookup
// (medicine name) without needing a generic keyword like "medicine" — used
// only to widen the medicine-ask trigger, never to justify a loose
// substring scan of the whole sentence. Requires a trailing subject so bare
// "what is..." questions (e.g. "what is your name") don't count — those are
// handled by BOT_IDENTITY_RE / the off-topic gate instead.
const MEDICINE_LOOKUP_PHRASE_RE = /\b(?:tell me about|info(?:rmation)? on|details (?:on|about))\s+\w+|\b(?:what is|what'?s)\s+(?!your\b|this\b|that\b|wrong\b|it\b)\w+/;

// Common-symptom -> appropriate OTC generic mapping, used only to suggest
// medicine categories worth asking a pharmacist about — never a specific
// dose. Deliberately small and hand-picked (not derived from free-text
// search over the `uses` column) because a plain keyword search over that
// field surfaces irrelevant noise on a 20k+ row dataset (e.g. a supplement
// whose long indications list happens to mention "headache" once). Real
// price/stock for each generic is still looked up live against the
// database, never hardcoded.
const OTC_SYMPTOM_MAP = [
  { re: /\bheadache\b/, generics: ['Paracetamol'] },
  { re: /\bfever\b/, generics: ['Paracetamol'] },
  { re: /\b(body ?ache|muscle pain|joint pain)\b/, generics: ['Paracetamol', 'Diclofenac'] },
  { re: /\b(acidity|heartburn|indigestion|gerd|acid reflux)\b/, generics: ['Omeprazole'] },
  { re: /\b(runny nose|sneezing|allerg|itchy eyes|hives|rash)\b/, generics: ['Cetirizine', 'Loratadine'] },
  { re: /\bcough\b/, generics: ['Ambroxol', 'Dextromethorphan'] },
  { re: /\b(diarrh(o|e)a|loose motion)\b/, generics: ['Loperamide', 'Oral Rehydration Salt'] },
  { re: /\b(nausea|vomit)\b/, generics: ['Domperidone'] }
];

// Looks up the cheapest in-stock brand for each generic name, in order,
// stopping once a handful have been found — used for OTC_SYMPTOM_MAP.
function findOtcSuggestions(lower, allergyTerms, chronicTerms) {
  const matchedGenerics = new Set();
  for (const rule of OTC_SYMPTOM_MAP) {
    if (rule.re.test(lower)) rule.generics.forEach(g => matchedGenerics.add(g));
  }
  const suggestions = [];
  for (const generic of matchedGenerics) {
    const candidates = getAll(
      'SELECT id, name, generic_name, price, stock FROM medicines WHERE LOWER(generic_name) LIKE ? AND stock > 0 ORDER BY price ASC LIMIT 5',
      [`%${generic.toLowerCase()}%`]
    );
    const safe = candidates.find(c => !isUnsafeForUser({ ...c, warnings: '', side_effects: '' }, allergyTerms, chronicTerms));
    if (safe) suggestions.push(safe);
  }
  return suggestions.slice(0, 4);
}

// Words to ignore when pulling a probable medicine name out of a sentence.
// This scan only ever runs once the message has already been confirmed to
// be an explicit medicine lookup (wantsMedicineInfo) — it is deliberately
// NOT used to opportunistically guess a medicine from an arbitrary symptom
// sentence, because ordinary English words are substrings of real brand
// names often enough to produce nonsense matches (e.g. "pain" -> "Painthol",
// "feel" -> "Feelfree", "napa" as a bare substring -> "Sonapata").
const MED_STOPWORDS = new Set(['medicine', 'medicines', 'drug', 'drugs', 'about', 'tell', 'what', 'whats', 'capsule',
  'tablet', 'tablets', 'syrup', 'the', 'this', 'that', 'for', 'and', 'price', 'cost', 'much', 'does', 'info',
  'information', 'details', 'give', 'show', 'find', 'search']);

function splitList(text) {
  if (!text) return [];
  return text.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// True if a medicine's name/generic overlaps a user-listed allergy, or a
// chronic condition appears in its warnings/side-effects text as something
// to avoid.
function isUnsafeForUser(medicine, allergyTerms, chronicTerms) {
  const nameLower = medicine.name.toLowerCase();
  const genericLower = medicine.generic_name.toLowerCase();
  const warningsLower = (medicine.warnings || '').toLowerCase();
  const sideEffectsLower = (medicine.side_effects || '').toLowerCase();

  for (const term of allergyTerms) {
    if (term.length > 2 && (nameLower.includes(term) || genericLower.includes(term))) {
      return `may trigger your listed allergy to ${term}`;
    }
  }
  for (const term of chronicTerms) {
    if (term.length > 3 && (warningsLower.includes(term) || sideEffectsLower.includes(term))) {
      return `carries a warning related to your ${term}`;
    }
  }
  return null;
}

function formatMedicineLine(m) {
  return `- **${m.name}** (${m.generic_name}) — ৳${Number(m.price || 0).toFixed(2)}${m.stock > 0 ? '' : ' — _out of stock_'}`;
}

function formatDoctorLine(d) {
  const ratingStr = d.review_count > 0 ? ` — ⭐${Number(d.rating).toFixed(1)} (${d.review_count} review${d.review_count === 1 ? '' : 's'})` : '';
  return `- **${d.name}** — ${d.specialty} at ${d.hospital}, ${d.location} — ৳${Number(d.consultation_fee).toFixed(0)} consultation${ratingStr}`;
}

// allowSubstringMatch: when false (the default, used for opportunistically
// scanning a message that never explicitly asked about a medicine), only
// exact-name or name-starts-with hits count. Common English words are
// substrings of real brand names often enough (e.g. "pain" -> "Painthol",
// "feel" -> "Feelfree") that a loose substring search on an unconstrained
// sentence produces false positives; it's only safe once the user has
// clearly signalled a medicine lookup (wantsMedicineInfo).
function findMedicineMention(lower, allowSubstringMatch = false) {
  const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !MED_STOPWORDS.has(w));

  for (const word of words) {
    const med = getOne(
      `SELECT *,
         CASE
           WHEN LOWER(name) = ? THEN 0
           WHEN LOWER(name) LIKE ? THEN 1
           WHEN LOWER(generic_name) = ? THEN 2
           WHEN LOWER(generic_name) LIKE ? THEN 3
           ELSE 4
         END AS rank
       FROM medicines
       WHERE LOWER(name) = ? OR LOWER(name) LIKE ?
          OR LOWER(generic_name) = ? OR LOWER(generic_name) LIKE ?
          ${allowSubstringMatch ? 'OR LOWER(name) LIKE ? OR LOWER(generic_name) LIKE ?' : ''}
       ORDER BY rank ASC, LENGTH(name) ASC LIMIT 1`,
      allowSubstringMatch
        ? [word, `${word}%`, word, `${word}%`, word, `${word}%`, word, `${word}%`, `%${word}%`, `%${word}%`]
        : [word, `${word}%`, word, `${word}%`, word, `${word}%`, word, `${word}%`]
    );
    if (med) return med;
  }
  return null;
}

function buildSpecialtiesFromSymptoms(lower) {
  // Match the free-text query against real disease records (name + symptoms
  // columns) instead of a fixed keyword dictionary, so it scales with
  // whatever is actually in the diseases table.
  const words = tokenize(lower).filter(w => w.length > 3);
  if (words.length === 0) return { diseases: [], specialties: [] };

  const clauses = words.map(() => '(LOWER(name) LIKE ? OR LOWER(symptoms) LIKE ?)').join(' OR ');
  const params = words.flatMap(w => [`%${w}%`, `%${w}%`]);

  const matches = getAll(
    `SELECT id, name, category, symptoms, related_specialties FROM diseases WHERE ${clauses} LIMIT 5`,
    params
  );

  const specialties = new Set();
  for (const d of matches) {
    if (d.related_specialties) {
      d.related_specialties.split(',').map(s => s.trim()).filter(Boolean).forEach(s => specialties.add(s));
    }
  }
  return { diseases: matches, specialties: Array.from(specialties) };
}

function generateResponse(message, user) {
  const lower = message.toLowerCase();

  const emergency = EMERGENCY_RULES.find(rule => rule.re.test(lower));
  if (emergency) {
    const isMentalHealthCrisis = emergency.label === 'a mental health crisis';
    return {
      text: `🚨 **This sounds like ${emergency.label} — please seek emergency care right now.**\n\n`
        + (isMentalHealthCrisis
          ? 'Please call a crisis helpline or go to the nearest emergency room immediately. You do not have to face this alone — help is available right now.'
          : 'Call emergency services or go to the nearest hospital immediately. Do **not** wait to self-medicate or look up guidance here first — this needs in-person medical attention now.'),
      doctors: [], medicines: []
    };
  }

  if (GREETING_RE.test(lower)) {
    return {
      text: 'Hello! I\'m the Medica Assistant. I can help you with:\n\n'
        + '- **Symptom guidance** - Describe your symptoms\n'
        + '- **Medicine information & prices** - Ask about any medicine\n'
        + '- **Doctor recommendations** - Find the right specialist, with ratings and reviews\n'
        + '- **Guidelines & investigations** - Official health guidance and test centers\n\n'
        + 'How can I help you today?' + DISCLAIMER,
      doctors: [], medicines: []
    };
  }

  if (THANKS_RE.test(lower)) {
    return {
      text: 'You\'re welcome! Take care of your health. Remember, if symptoms persist or worsen, always consult a qualified doctor.' + DISCLAIMER,
      doctors: [], medicines: []
    };
  }

  if (BOT_IDENTITY_RE.test(lower)) {
    return {
      text: 'I\'m the **Medica Assistant** — a health guidance bot for this platform. I can help you with symptom guidance, '
        + 'medicine information and prices, doctor recommendations, and official health guidelines. What can I help you with?',
      doctors: [], medicines: []
    };
  }

  if (DIAGNOSIS_REQUEST_RE.test(lower)) {
    return {
      text: 'I can\'t tell you whether you have a specific condition — that needs an in-person exam by a doctor. '
        + 'What I *can* do is point you to the right specialist and share general guidance for your symptoms. '
        + 'Try describing what you\'re feeling (e.g. "I have a fever and sore throat") and I\'ll suggest next steps.' + DISCLAIMER,
      doctors: [], medicines: []
    };
  }

  // wantsMedicineInfo gates the ONLY path that runs a medicine-name scan —
  // either a generic keyword ("medicine", "price", ...) or a "tell me
  // about X" / "what is X" lookup phrase. It never fires from bare symptom
  // wording, so a sentence like "I have chest pain" can't accidentally
  // resolve to some unrelated brand whose name contains "pain".
  const wantsMedicineInfo = /\b(medicine|drug|tablet|capsule|syrup|dose|dosage|side effect|price|cost)\b/.test(lower)
    || MEDICINE_LOOKUP_PHRASE_RE.test(lower);
  const directMedicineMatch = wantsMedicineInfo ? findMedicineMention(lower, true) : null;

  // A specific specialty name ("cardiologist", "dermatologist", ...) is
  // just as clear a medical signal as the generic word "doctor" — looked up
  // once here and reused by the doctor-ask section below.
  const specialtyRows = getAll('SELECT DISTINCT specialty FROM doctors');
  const mentionedSpecialty = specialtyRows.find(s => lower.includes(s.specialty.toLowerCase()));

  if (!MEDICAL_SIGNAL_RE.test(lower) && !directMedicineMatch && !mentionedSpecialty) {
    return {
      text: 'I\'m the Medica health assistant, so I can only help with medical questions — symptoms, medicines, doctors, '
        + 'guidelines, and diagnostic tests. Could you rephrase your question around a health concern?',
      doctors: [], medicines: []
    };
  }

  const allergyTerms = user ? splitList(user.allergies) : [];
  const chronicTerms = user ? splitList(user.chronic_diseases).flatMap(t => tokenize(t)) : [];

  const sections = [];
  let anyDoctors = [];
  let anyMedicines = [];

  // --- Direct medicine lookup (name/generic mention, or explicit ask) ---
  if (wantsMedicineInfo || directMedicineMatch) {
    const med = directMedicineMatch;
    if (med) {
      const unsafeReason = isUnsafeForUser(med, allergyTerms, chronicTerms);
      let text = `**${med.name}** (${med.generic_name})\n\n`
        + `**Uses:** ${med.uses}\n\n`
        + `**Dosage:** ${med.dosage}\n\n`
        + `**Price:** ৳${Number(med.price || 0).toFixed(2)}${med.stock > 0 ? ` (${med.stock} in stock)` : ' (out of stock)'}\n\n`
        + `**Side Effects:** ${med.side_effects}\n\n`
        + `**Warnings:** ${med.warnings}`;

      if (unsafeReason) {
        text = `⚠️ **Caution:** Based on your medical profile, ${med.name} ${unsafeReason}. Please check with a pharmacist or doctor before taking it.\n\n` + text;
      } else {
        const alternatives = getAll(
          `SELECT id, name, generic_name, price, stock FROM medicines
           WHERE id != ? AND category = (SELECT category FROM medicines WHERE id = ?) AND stock > 0
           ORDER BY price ASC LIMIT 3`,
          [med.id, med.id]
        ).filter(alt => !isUnsafeForUser({ ...alt, warnings: '', side_effects: '' }, allergyTerms, chronicTerms));

        if (alternatives.length > 0) {
          text += '\n\n**Alternatives:**\n' + alternatives.map(formatMedicineLine).join('\n');
        }
      }

      sections.push(text);
      anyMedicines.push(med.name);
    } else if (!/\b(pain|ache|hurt|fever|cough|cold|flu|sick|ill|symptom|doctor|specialist|hospital|clinic|appointment|disease|condition|diagnos|treatment|guideline|test|investigation|scan|checkup|check-up|allerg|prescri|health|blood|surgery|infection)\b/.test(lower)) {
      // The message was *only* a medicine ask and nothing matched.
      sections.push('I couldn\'t find that medicine in our database. Could you double-check the spelling, or try the generic name?');
    }
  }

  // --- Symptom-driven guidance: real diseases + specialists + guidelines + investigation centers ---
  const { diseases, specialties } = buildSpecialtiesFromSymptoms(lower);
  const looksLikeSymptomDescription = /\b(i have|i feel|i am|my|suffering|pain|ache|fever|symptom)\b/.test(lower) || diseases.length > 0;

  if (looksLikeSymptomDescription && diseases.length > 0) {
    let text = '**Based on what you described:**\n\n';
    diseases.slice(0, 3).forEach(d => {
      text += `- **${d.name}** (${d.category})\n`;
    });

    // Only offer OTC suggestions if the direct-medicine-lookup block above
    // didn't already answer a specific medicine question this turn.
    if (anyMedicines.length === 0) {
      const otc = findOtcSuggestions(lower, allergyTerms, chronicTerms);
      if (otc.length > 0) {
        text += '\n**Over-the-counter options to ask your pharmacist about:**\n' + otc.map(formatMedicineLine).join('\n') + '\n';
        anyMedicines = otc.map(m => m.name);
      }
    }

    let doctors = [];
    if (specialties.length > 0) {
      const placeholders = specialties.map(() => '?').join(',');
      doctors = getAll(
        `SELECT d.*, COALESCE(AVG(r.rating), d.rating) as rating, COUNT(r.id) as review_count
         FROM doctors d LEFT JOIN reviews r ON r.doctor_id = d.id
         WHERE d.specialty IN (${placeholders})
         GROUP BY d.id ORDER BY rating DESC, review_count DESC LIMIT 5`,
        specialties
      );
    }

    if (doctors.length > 0) {
      text += '\n**Recommended specialists:**\n' + doctors.map(formatDoctorLine).join('\n');
      anyDoctors = doctors;
    }

    const guidelines = getAll(
      `SELECT title, authority, link FROM guidelines WHERE LOWER(category) IN (${diseases.map(() => 'LOWER(?)').join(',')}) LIMIT 3`,
      diseases.map(d => d.category)
    );
    if (guidelines.length > 0) {
      text += '\n\n**Official guidelines:**\n' + guidelines.map(g => `- ${g.title} (${g.authority})`).join('\n');
    }

    if (/\btest|investigation|scan|checkup|check-up\b/.test(lower)) {
      const centers = getAll('SELECT name, location, available_tests FROM investigation_centers LIMIT 3');
      if (centers.length > 0) {
        text += '\n\n**Nearby diagnostic centers:**\n' + centers.map(c => `- ${c.name}, ${c.location}`).join('\n');
      }
    }

    sections.push(text);
  }

  // --- Pure "find me a doctor" / specialty ask, without a symptom match ---
  const wantsDoctor = /\b(doctor|specialist|physician|hospital|clinic|appointment)\b/.test(lower) || !!mentionedSpecialty;
  if (wantsDoctor && anyDoctors.length === 0) {
    let doctors = [];
    if (mentionedSpecialty) {
      doctors = getAll(
        `SELECT d.*, COALESCE(AVG(r.rating), d.rating) as rating, COUNT(r.id) as review_count
         FROM doctors d LEFT JOIN reviews r ON r.doctor_id = d.id
         WHERE d.specialty = ? GROUP BY d.id ORDER BY rating DESC LIMIT 5`,
        [mentionedSpecialty.specialty]
      );
    }
    if (doctors.length > 0) {
      sections.push(`**${mentionedSpecialty.specialty} specialists:**\n` + doctors.map(formatDoctorLine).join('\n')
        + '\n\nYou can book an appointment from the Doctors or Appointments page.');
      anyDoctors = doctors;
    } else if (sections.length === 0) {
      sections.push('Could you tell me what kind of specialist you\'re looking for, or describe your symptoms so I can match you with the right one?');
    }
  }

  if (sections.length === 0) {
    sections.push('I\'m not sure I fully understand your concern. Could you describe your symptoms, or ask about a specific medicine, doctor, or test? For example:\n\n'
      + '- "I have a headache and fever"\n'
      + '- "I need a cardiologist"\n'
      + '- "What\'s the price of Napa?"\n'
      + '- "I have stomach pain, are there any investigation centers nearby?"');
  }

  return { text: sections.join('\n\n---\n\n') + DISCLAIMER, doctors: anyDoctors, medicines: anyMedicines };
}

router.post('/', authenticateToken, (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const user = getOne('SELECT allergies, chronic_diseases FROM users WHERE id = ?', [req.user.id]);
    const response = generateResponse(message.trim(), user);

    runQuery('INSERT INTO chat_logs (user_id, message, response) VALUES (?, ?, ?)',
      [req.user.id, message, response.text]);

    res.json({ response: response.text, doctors: response.doctors, medicines: response.medicines });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chat processing failed.' });
  }
});

router.get('/history', authenticateToken, (req, res) => {
  const logs = getAll(
    'SELECT message, response, created_at FROM chat_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ logs });
});

module.exports = router;
