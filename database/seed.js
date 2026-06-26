require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initDatabase, runQuery, getOne, saveDb } = require('./setup');

async function seed() {
  await initDatabase();

  const medicines = [
    { name: 'Napa', generic_name: 'Paracetamol (Acetaminophen)', uses: 'Relief of mild to moderate pain including headache, toothache, muscle pain, and reduction of fever.', dosage: 'Adults: 500mg-1000mg every 4-6 hours. Maximum 4g per day. Children: 10-15mg/kg every 4-6 hours.', side_effects: 'Nausea, allergic reactions (rare), liver damage with overdose, skin rash.', warnings: 'Do not exceed recommended dose. Avoid alcohol. Consult doctor if symptoms persist beyond 3 days. Not recommended for severe liver disease.', category: 'Pain Relief' },
    { name: 'Seclo', generic_name: 'Omeprazole', uses: 'Treatment of gastric and duodenal ulcers, gastroesophageal reflux disease (GERD), and Zollinger-Ellison syndrome.', dosage: 'Adults: 20mg once daily before breakfast for 4-8 weeks. Maintenance: 10-20mg daily.', side_effects: 'Headache, nausea, diarrhea, constipation, abdominal pain, flatulence.', warnings: 'Long-term use may cause vitamin B12 deficiency and bone fractures. Not for immediate relief of heartburn.', category: 'Gastric' },
    { name: 'Azimax', generic_name: 'Azithromycin', uses: 'Treatment of respiratory tract infections, skin infections, ear infections, and sexually transmitted diseases.', dosage: 'Adults: 500mg on day 1, then 250mg daily for days 2-5. Or 500mg daily for 3 days.', side_effects: 'Diarrhea, nausea, abdominal pain, vomiting, headache, dizziness.', warnings: 'Complete the full course. May cause QT prolongation. Inform doctor about liver or kidney problems.', category: 'Antibiotic' },
    { name: 'Losectil', generic_name: 'Esomeprazole', uses: 'Treatment of GERD, erosive esophagitis, peptic ulcer disease, and prevention of NSAID-associated ulcers.', dosage: 'Adults: 20-40mg once daily. Healing of erosive esophagitis: 40mg daily for 4-8 weeks.', side_effects: 'Headache, diarrhea, nausea, flatulence, abdominal pain, dry mouth.', warnings: 'Symptomatic response does not rule out gastric malignancy. Use lowest effective dose for shortest duration.', category: 'Gastric' },
    { name: 'Ace Plus', generic_name: 'Paracetamol + Caffeine', uses: 'Relief of headache, migraine, muscle pain, toothache, period pain, and cold symptoms.', dosage: 'Adults: 1-2 tablets every 4-6 hours as needed. Maximum 8 tablets in 24 hours.', side_effects: 'Insomnia (due to caffeine), nervousness, nausea, allergic reactions.', warnings: 'Contains caffeine - avoid excessive tea/coffee intake. Do not use with other paracetamol products.', category: 'Pain Relief' },
    { name: 'Sergel', generic_name: 'Esomeprazole', uses: 'Treatment of acid reflux, GERD, peptic ulcer, and H. pylori eradication (combination therapy).', dosage: 'Adults: 20-40mg once daily before meal. Duration depends on condition.', side_effects: 'Headache, abdominal pain, diarrhea, nausea, constipation.', warnings: 'Long-term use may increase risk of bone fractures. Monitor magnesium levels during prolonged treatment.', category: 'Gastric' },
    { name: 'Zimax', generic_name: 'Azithromycin', uses: 'Bacterial infections of the lungs, sinuses, throat, tonsils, skin, urinary tract, cervix.', dosage: 'Adults: 500mg once daily for 3 days. Or 500mg day 1 then 250mg days 2-5.', side_effects: 'Stomach upset, diarrhea, vomiting, headache, skin rash.', warnings: 'Take 1 hour before or 2 hours after meals. Do not use antacids within 2 hours.', category: 'Antibiotic' },
    { name: 'Monas', generic_name: 'Montelukast', uses: 'Prevention and long-term treatment of asthma. Relief of seasonal allergic rhinitis.', dosage: 'Adults: 10mg once daily in the evening. Children 6-14: 5mg chewable tablet daily.', side_effects: 'Headache, abdominal pain, fatigue, dizziness, mood changes.', warnings: 'Not for acute asthma attacks. Monitor for behavioral and mood changes.', category: 'Respiratory' },
    { name: 'Fenobid', generic_name: 'Fenofibrate', uses: 'Treatment of high cholesterol and triglycerides. Used to reduce cardiovascular risk.', dosage: 'Adults: 160mg once daily with food. Adjust dose based on lipid levels.', side_effects: 'Stomach pain, nausea, headache, back pain, muscle pain.', warnings: 'Monitor liver function tests. May increase risk of gallstones.', category: 'Cardiovascular' },
    { name: 'Losartan', generic_name: 'Losartan Potassium', uses: 'Treatment of hypertension, diabetic nephropathy, and reduction of stroke risk.', dosage: 'Adults: Start 50mg once daily. May increase to 100mg once daily.', side_effects: 'Dizziness, fatigue, hypotension, hyperkalemia, back pain.', warnings: 'Do not use during pregnancy. Monitor potassium levels.', category: 'Cardiovascular' },
    { name: 'Ciprocin', generic_name: 'Ciprofloxacin', uses: 'Treatment of urinary tract infections, respiratory infections, skin infections, bone and joint infections.', dosage: 'Adults: 250-750mg twice daily for 7-14 days depending on infection type.', side_effects: 'Nausea, diarrhea, dizziness, headache, tendon inflammation.', warnings: 'Avoid in children and pregnant women. May cause tendon rupture. Avoid sun exposure.', category: 'Antibiotic' },
    { name: 'Algin', generic_name: 'Antacid (Alginate)', uses: 'Relief of heartburn, acid indigestion, and gastroesophageal reflux symptoms.', dosage: 'Adults: 10-20ml after meals and at bedtime. Shake well before use.', side_effects: 'Constipation, diarrhea, bloating (rare).', warnings: 'Contains sodium - use with caution in heart failure and hypertension.', category: 'Gastric' },
    { name: 'Amoxil', generic_name: 'Amoxicillin', uses: 'Treatment of bacterial infections including ear, nose, throat, urinary tract, and skin infections.', dosage: 'Adults: 250-500mg every 8 hours. Children: 20-40mg/kg/day divided into 3 doses.', side_effects: 'Diarrhea, nausea, skin rash, vomiting, allergic reactions.', warnings: 'Inform doctor of penicillin allergy. Complete full course of antibiotics.', category: 'Antibiotic' },
    { name: 'Amlodipine', generic_name: 'Amlodipine Besylate', uses: 'Treatment of high blood pressure and angina (chest pain). Prevention of cardiovascular events.', dosage: 'Adults: Start 5mg once daily. May increase to 10mg daily. Elderly: Start 2.5mg.', side_effects: 'Edema, headache, fatigue, dizziness, flushing, palpitations.', warnings: 'Monitor blood pressure regularly. Do not stop suddenly.', category: 'Cardiovascular' },
    { name: 'Histacin', generic_name: 'Chlorpheniramine Maleate', uses: 'Relief of allergic rhinitis, hay fever, urticaria, and other allergic conditions.', dosage: 'Adults: 4mg every 4-6 hours. Maximum 24mg per day. Children 6-12: 2mg every 4-6 hours.', side_effects: 'Drowsiness, dry mouth, blurred vision, constipation, urinary retention.', warnings: 'Causes drowsiness - avoid driving. Avoid alcohol.', category: 'Allergy' },
    { name: 'Metformin', generic_name: 'Metformin Hydrochloride', uses: 'First-line treatment for type 2 diabetes mellitus. Helps control blood sugar levels.', dosage: 'Adults: Start 500mg twice daily with meals. Gradually increase to max 2550mg/day.', side_effects: 'Nausea, diarrhea, stomach pain, metallic taste, decreased appetite.', warnings: 'Monitor kidney function. Stop before contrast imaging. Risk of lactic acidosis.', category: 'Diabetes' },
    { name: 'Orcef', generic_name: 'Cefixime', uses: 'Treatment of gonorrhea, tonsillitis, pharyngitis, bronchitis, and urinary tract infections.', dosage: 'Adults: 400mg daily as single dose or 200mg twice daily. Children: 8mg/kg/day.', side_effects: 'Diarrhea, nausea, abdominal pain, headache, dizziness.', warnings: 'Inform doctor of cephalosporin or penicillin allergy. Complete full course.', category: 'Antibiotic' },
    { name: 'Calcium-D', generic_name: 'Calcium Carbonate + Vitamin D3', uses: 'Prevention and treatment of calcium and vitamin D deficiency. Osteoporosis prevention.', dosage: 'Adults: 1-2 tablets daily with meals. Take as directed by physician.', side_effects: 'Constipation, bloating, gas, hypercalcemia with excessive use.', warnings: 'Do not exceed recommended dose. May interact with certain antibiotics.', category: 'Vitamins' }
  ];

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
    { name: 'Dr. Salma Rahman', hospital: 'Popular Medical College Hospital', specialty: 'Endocrinology', location: 'Dhaka', contact: '+880-2-9116551', email: 'salma.r@popularbd.com' },
    { name: 'Dr. Anisur Rahman', hospital: 'Khulna Medical College Hospital', specialty: 'Pulmonology', location: 'Khulna', contact: '+880-41-720062', email: 'anisur.r@kmch.gov.bd' },
    { name: 'Dr. Farhana Yasmin', hospital: 'Lab Aid Hospital', specialty: 'Psychiatry', location: 'Dhaka', contact: '+880-2-9612345', email: 'farhana.y@labaidbd.com' },
    { name: 'Dr. Habibur Rahman', hospital: 'Barishal Sher-E-Bangla Medical College', specialty: 'General Surgery', location: 'Barishal', contact: '+880-431-63001', email: 'habibur.r@bsmch.gov.bd' },
    { name: 'Dr. Nusrat Jahan', hospital: 'Green Life Medical College Hospital', specialty: 'Nephrology', location: 'Dhaka', contact: '+880-2-9852456', email: 'nusrat.j@greenlifebd.com' },
    { name: 'Dr. Mizanur Rahman', hospital: 'Rangpur Medical College Hospital', specialty: 'Urology', location: 'Rangpur', contact: '+880-521-63401', email: 'mizanur.r@rmchr.gov.bd' }
  ];

  let medCount = 0;
  for (const m of medicines) {
    const exists = getOne('SELECT id FROM medicines WHERE name = ?', [m.name]);
    if (!exists) {
      runQuery(
        'INSERT INTO medicines (name, generic_name, uses, dosage, side_effects, warnings, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [m.name, m.generic_name, m.uses, m.dosage, m.side_effects, m.warnings, m.category]
      );
      medCount++;
    }
  }

  let docCount = 0;
  for (const d of doctors) {
    const exists = getOne('SELECT id FROM doctors WHERE name = ?', [d.name]);
    if (!exists) {
      runQuery(
        'INSERT INTO doctors (name, hospital, specialty, location, contact, email) VALUES (?, ?, ?, ?, ?, ?)',
        [d.name, d.hospital, d.specialty, d.location, d.contact, d.email]
      );
      docCount++;
    }
  }

  saveDb();

  const totalMeds = getOne('SELECT COUNT(*) as c FROM medicines');
  const totalDocs = getOne('SELECT COUNT(*) as c FROM doctors');

  if (medCount > 0 || docCount > 0) {
    console.log(`Seeded ${medCount} new medicines and ${docCount} new doctors.`);
  } else {
    console.log('Database already has seed data — no new records inserted.');
  }
  console.log(`Total: ${totalMeds.c} medicines, ${totalDocs.c} doctors in database.`);

  setTimeout(() => process.exit(0), 100);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  setTimeout(() => process.exit(1), 100);
});
