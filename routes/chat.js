const express = require('express');
const router = express.Router();
const { runQuery, getOne, getAll } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

const DISCLAIMER = '\n\n⚠️ **Disclaimer:** This is not a medical diagnosis. Please consult a real doctor for proper medical advice.';

const symptomDatabase = {
  headache: {
    specialties: ['Neurology'],
    medicines: ['Napa (Paracetamol)', 'Ace Plus (Paracetamol + Caffeine)'],
    advice: 'Headaches can be caused by stress, dehydration, lack of sleep, or underlying conditions. Rest, stay hydrated, and consider over-the-counter pain relief like Paracetamol (500mg-1000mg). If headaches are severe, frequent, or accompanied by vision changes, seek immediate medical attention.'
  },
  fever: {
    specialties: ['Pediatrics'],
    medicines: ['Napa (Paracetamol 500mg)', 'Ace Plus'],
    advice: 'Fever is usually a sign of infection. Take Paracetamol to reduce temperature, drink plenty of fluids, and rest. If fever exceeds 103°F (39.4°C), lasts more than 3 days, or is accompanied by severe symptoms, see a doctor immediately.'
  },
  stomach: {
    specialties: ['Gastroenterology'],
    medicines: ['Seclo (Omeprazole)', 'Algin (Antacid)'],
    advice: 'Stomach pain can range from indigestion to serious conditions. For mild acidity, antacids or Omeprazole may help. Avoid spicy food and eat smaller meals. If pain is severe, persistent, or accompanied by vomiting blood, seek emergency care.'
  },
  cough: {
    specialties: ['Pulmonology', 'ENT'],
    medicines: ['Histacin (Chlorpheniramine)', 'Amoxil (Amoxicillin) - only with prescription'],
    advice: 'A cough can be caused by cold, allergies, or infections. Stay hydrated, use honey with warm water, and rest. For persistent cough lasting more than 2 weeks, especially with blood or breathlessness, consult a pulmonologist.'
  },
  chest: {
    specialties: ['Cardiology'],
    medicines: [],
    advice: '🚨 **Chest pain requires immediate medical attention.** It could indicate a heart attack, angina, or other serious conditions. Do NOT self-medicate. Call emergency services or go to the nearest hospital immediately.'
  },
  allergy: {
    specialties: ['Dermatology', 'ENT'],
    medicines: ['Histacin (Chlorpheniramine)', 'Monas (Montelukast)'],
    advice: 'Allergic reactions can cause sneezing, rash, or swelling. Antihistamines like Chlorpheniramine can help. Identify and avoid triggers. For severe reactions (difficulty breathing, swelling of throat), seek emergency care immediately.'
  },
  diabetes: {
    specialties: ['Endocrinology'],
    medicines: ['Metformin (with prescription only)'],
    advice: 'Diabetes requires proper medical management. Monitor blood sugar regularly, follow a balanced diet, exercise regularly, and take medications as prescribed. Regular check-ups with an endocrinologist are essential.'
  },
  pressure: {
    specialties: ['Cardiology'],
    medicines: ['Losartan (with prescription)', 'Amlodipine (with prescription)'],
    advice: 'High blood pressure needs ongoing management. Reduce salt intake, exercise regularly, manage stress, and take prescribed medications. Monitor BP at home and visit your cardiologist regularly.'
  },
  skin: {
    specialties: ['Dermatology'],
    medicines: [],
    advice: 'Skin conditions vary widely - from eczema to infections. Keep the affected area clean and dry. Avoid scratching. For persistent rashes, unusual moles, or spreading infections, consult a dermatologist.'
  },
  eye: {
    specialties: ['Ophthalmology'],
    medicines: [],
    advice: 'Eye problems should be evaluated by an ophthalmologist. Do not self-medicate with eye drops. For sudden vision loss, eye pain, or injury, seek immediate medical attention.'
  },
  ear: {
    specialties: ['ENT'],
    medicines: [],
    advice: 'Ear problems including pain, discharge, or hearing loss should be evaluated by an ENT specialist. Do not insert objects into the ear canal. For sudden hearing loss, see a doctor immediately.'
  },
  bone: {
    specialties: ['Orthopedics'],
    medicines: ['Napa (Paracetamol)', 'Calcium-D (Calcium + Vitamin D3)'],
    advice: 'Bone and joint pain can be due to injury, arthritis, or deficiency. Rest the affected area, apply ice for swelling, and take pain relief. For fractures, persistent pain, or mobility issues, consult an orthopedic specialist.'
  },
  mental: {
    specialties: ['Psychiatry'],
    medicines: [],
    advice: 'Mental health is as important as physical health. If you are experiencing anxiety, depression, or other mental health concerns, please reach out to a psychiatrist or counselor. You are not alone, and professional help is available.'
  },
  depression: {
    specialties: ['Psychiatry'],
    medicines: [],
    advice: 'Depression is a treatable condition. Please reach out to a psychiatrist or mental health professional. Talk therapy and medication can be very effective. You are not alone - help is available.'
  },
  anxiety: {
    specialties: ['Psychiatry'],
    medicines: [],
    advice: 'Anxiety can be managed with professional help. Practice deep breathing, regular exercise, and adequate sleep. If anxiety affects your daily life, consult a psychiatrist for proper evaluation and treatment.'
  },
  urinary: {
    specialties: ['Urology', 'Nephrology'],
    medicines: ['Ciprocin (Ciprofloxacin) - only with prescription'],
    advice: 'Urinary problems like burning, frequency, or blood in urine need medical evaluation. Drink plenty of water. For UTIs, antibiotics may be prescribed by a doctor. Do not self-medicate with antibiotics.'
  },
  child: {
    specialties: ['Pediatrics'],
    medicines: [],
    advice: 'Children require specialized medical care. For fever, give age-appropriate Paracetamol doses. Keep them hydrated. For any concerning symptoms, consult a pediatrician promptly.'
  },
  pregnant: {
    specialties: ['Gynecology'],
    medicines: [],
    advice: 'Pregnancy requires regular medical monitoring. Visit a gynecologist for prenatal care. Do NOT take any medication without consulting your doctor during pregnancy.'
  },
  heart: {
    specialties: ['Cardiology'],
    medicines: [],
    advice: 'Heart-related symptoms need prompt medical evaluation. Do not ignore chest pain, shortness of breath, or palpitations. Maintain a heart-healthy lifestyle and see a cardiologist for regular check-ups.'
  },
  breathing: {
    specialties: ['Pulmonology'],
    medicines: ['Monas (Montelukast)'],
    advice: 'Breathing difficulties can be caused by asthma, infections, or heart conditions. If you experience sudden severe shortness of breath, seek emergency care. For chronic breathing issues, consult a pulmonologist.'
  }
};

function generateResponse(message) {
  const lower = message.toLowerCase();

  if (lower.match(/\b(hi|hello|hey|assalamu|salam|greetings)\b/)) {
    return {
      text: 'Hello! I\'m the Medica Assistant. I can help you with:\n\n'
        + '- **Symptom guidance** - Describe your symptoms\n'
        + '- **Medicine information** - Ask about any medicine\n'
        + '- **Doctor recommendations** - Find the right specialist\n'
        + '- **General health tips** - Basic health advice\n\n'
        + 'How can I help you today?' + DISCLAIMER,
      doctors: [],
      medicines: []
    };
  }

  if (lower.match(/\b(thank|thanks|dhonnobad|shukria)\b/)) {
    return {
      text: 'You\'re welcome! Take care of your health. Remember, if symptoms persist or worsen, always consult a qualified doctor.' + DISCLAIMER,
      doctors: [],
      medicines: []
    };
  }

  let matchedSymptom = null;
  for (const [symptom, data] of Object.entries(symptomDatabase)) {
    if (lower.includes(symptom)) {
      matchedSymptom = { symptom, ...data };
      break;
    }
  }

  if (matchedSymptom) {
    let doctors = [];
    if (matchedSymptom.specialties.length > 0) {
      const placeholders = matchedSymptom.specialties.map(() => '?').join(',');
      doctors = getAll(
        `SELECT id, name, hospital, specialty, location, contact FROM doctors WHERE specialty IN (${placeholders}) LIMIT 5`,
        matchedSymptom.specialties
      );
    }

    let responseText = `Based on your description about **${matchedSymptom.symptom}**:\n\n`;
    responseText += `**Guidance:** ${matchedSymptom.advice}\n\n`;

    if (matchedSymptom.medicines.length > 0) {
      responseText += '**Over-the-counter options:**\n';
      matchedSymptom.medicines.forEach(m => {
        responseText += `- ${m}\n`;
      });
      responseText += '\n';
    }

    if (doctors.length > 0) {
      responseText += '**Recommended specialists near you:**\n';
      doctors.forEach(d => {
        responseText += `- **${d.name}** - ${d.specialty} at ${d.hospital}, ${d.location} (${d.contact})\n`;
      });
    }

    const diseases = getAll(
      `SELECT id, name, category FROM diseases WHERE LOWER(name) LIKE ? OR LOWER(symptoms) LIKE ? LIMIT 3`,
      [`%${matchedSymptom.symptom}%`, `%${matchedSymptom.symptom}%`]
    );
    if (diseases.length > 0) {
      responseText += '\n**Related health articles:**\n';
      diseases.forEach(d => {
        responseText += `- ${d.name} (${d.category})\n`;
      });
    }

    const centers = getAll(
      `SELECT id, name, location FROM investigation_centers LIMIT 3`
    );
    if (centers.length > 0) {
      responseText += '\n**Nearby diagnostic centers:**\n';
      centers.forEach(c => {
        responseText += `- ${c.name}, ${c.location}\n`;
      });
    }

    responseText += DISCLAIMER;
    return { text: responseText, doctors, medicines: matchedSymptom.medicines };
  }

  if (lower.match(/\b(medicine|drug|tablet|capsule|syrup)\b/)) {
    const words = lower.split(/\s+/);
    const skipWords = ['medicine', 'drug', 'tablet', 'about', 'tell', 'what', 'capsule', 'syrup', 'the', 'this', 'that', 'for', 'and'];
    for (const word of words) {
      if (word.length > 3 && !skipWords.includes(word)) {
        const med = getOne(
          'SELECT * FROM medicines WHERE LOWER(name) LIKE ? OR LOWER(generic_name) LIKE ? LIMIT 1',
          [`%${word}%`, `%${word}%`]
        );
        if (med) {
          return {
            text: `**${med.name}** (${med.generic_name})\n\n`
              + `**Uses:** ${med.uses}\n\n`
              + `**Dosage:** ${med.dosage}\n\n`
              + `**Side Effects:** ${med.side_effects}\n\n`
              + `**Warnings:** ${med.warnings}`
              + DISCLAIMER,
            doctors: [],
            medicines: [med.name]
          };
        }
      }
    }
  }

  return {
    text: 'I\'m not sure I fully understand your concern. Could you please describe your symptoms more specifically? For example:\n\n'
      + '- "I have a headache and fever"\n'
      + '- "I need a doctor for heart problems"\n'
      + '- "Tell me about Napa medicine"\n'
      + '- "I have stomach pain after eating"\n'
      + '- "My child is sick with fever"\n\n'
      + 'I\'m here to help guide you to the right medical care.' + DISCLAIMER,
    doctors: [],
    medicines: []
  };
}

router.post('/', authenticateToken, (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const response = generateResponse(message.trim());

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
