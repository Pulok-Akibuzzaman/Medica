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

  const diseases = [
    { name: 'Diabetes Mellitus', category: 'Endocrine', overview: 'Chronic disease affecting blood glucose regulation.', causes: 'Genetic factors, obesity, sedentary lifestyle, autoimmune destruction of beta cells.', symptoms: 'Increased thirst, frequent urination, fatigue, blurred vision, slow wound healing.', risk_factors: 'Family history, age over 45, obesity, hypertension, physical inactivity.', diagnosis: 'Fasting blood glucose, HbA1c, random blood glucose, oral glucose tolerance test.', treatment: 'Lifestyle modifications, medications (metformin, sulfonylureas, insulin), regular monitoring.', prevention: 'Healthy diet, regular exercise, weight management, stress reduction.', related_specialties: 'Endocrinology, Internal Medicine' },
    { name: 'Hypertension', category: 'Cardiovascular', overview: 'Elevated blood pressure affecting cardiovascular health.', causes: 'Obesity, excessive sodium intake, stress, alcohol consumption, genetic predisposition.', symptoms: 'Often asymptomatic, but may cause headaches, dizziness, chest pain, shortness of breath.', risk_factors: 'Age, family history, obesity, excessive alcohol, sedentary lifestyle, diabetes.', diagnosis: 'Blood pressure measurement, ECG, kidney function tests, lipid profile.', treatment: 'Lifestyle changes, antihypertensive medications (ACE inhibitors, beta-blockers, diuretics).', prevention: 'Reduce sodium intake, regular exercise, stress management, weight loss, limit alcohol.', related_specialties: 'Cardiology, Internal Medicine' },
    { name: 'Asthma', category: 'Respiratory', overview: 'Chronic inflammatory disease of the airways causing breathing difficulties.', causes: 'Genetic factors, allergies, air pollution, respiratory infections, occupational exposure.', symptoms: 'Wheezing, shortness of breath, chest tightness, coughing especially at night.', risk_factors: 'Family history, allergies, obesity, air pollution exposure, gastroesophageal reflux.', diagnosis: 'Spirometry, peak flow measurement, bronchial challenge tests, allergy testing.', treatment: 'Inhalers (rescue and maintenance), corticosteroids, leukotriene antagonists, immunotherapy.', prevention: 'Avoid triggers, maintain healthy weight, control allergies, avoid air pollution.', related_specialties: 'Pulmonology, Internal Medicine, Allergology' },
    { name: 'Gastroesophageal Reflux Disease (GERD)', category: 'Gastric', overview: 'Chronic disease where stomach acid flows back into the esophagus.', causes: 'Weak lower esophageal sphincter, obesity, pregnancy, alcohol consumption, smoking.', symptoms: 'Heartburn, regurgitation, chest pain, difficulty swallowing, chronic cough.', risk_factors: 'Obesity, smoking, alcohol consumption, large meals, lying down after eating.', diagnosis: 'Endoscopy, pH monitoring, barium x-ray, manometry.', treatment: 'Proton pump inhibitors, H2-receptor antagonists, antacids, lifestyle modifications.', prevention: 'Avoid trigger foods, eat smaller meals, elevate head while sleeping, weight management.', related_specialties: 'Gastroenterology, Internal Medicine' },
    { name: 'Pneumonia', category: 'Respiratory', overview: 'Infection causing inflammation of lung alveoli and fluid accumulation.', causes: 'Bacterial (Streptococcus pneumoniae), viral, fungal pathogens, aspiration.', symptoms: 'Fever, cough with productive sputum, chest pain, shortness of breath, fatigue.', risk_factors: 'Smoking, chronic lung disease, immunosuppression, hospitalization, age extremes.', diagnosis: 'Chest X-ray, sputum culture, blood culture, CBC with differential.', treatment: 'Antibiotics (based on causative organism), oxygen therapy, supportive care.', prevention: 'Vaccination (pneumococcal, influenza), avoid smoking, hand hygiene, avoid respiratory irritants.', related_specialties: 'Pulmonology, Infectious Disease, Internal Medicine' },
    { name: 'Myocardial Infarction (Heart Attack)', category: 'Cardiovascular', overview: 'Acute necrosis of heart muscle due to interrupted blood supply.', causes: 'Atherosclerosis, thrombosis, coronary artery spasm, plaque rupture.', symptoms: 'Severe chest pain, shortness of breath, diaphoresis, nausea, palpitations.', risk_factors: 'Hypertension, hyperlipidemia, diabetes, smoking, family history, male gender.', diagnosis: 'ECG, troponin levels, myoglobin, echocardiography, coronary angiography.', treatment: 'Aspirin, antiplatelet agents, anticoagulants, beta-blockers, ACE inhibitors, revascularization.', prevention: 'Control risk factors, healthy diet, regular exercise, stress management, smoking cessation.', related_specialties: 'Cardiology, Emergency Medicine, Interventional Cardiology' }
  ];

  let diseaseCount = 0;
  for (const d of diseases) {
    const exists = getOne('SELECT id FROM diseases WHERE name = ?', [d.name]);
    if (!exists) {
      runQuery(
        'INSERT INTO diseases (name, category, overview, causes, symptoms, risk_factors, diagnosis, treatment, prevention, related_specialties) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [d.name, d.category, d.overview, d.causes, d.symptoms, d.risk_factors, d.diagnosis, d.treatment, d.prevention, d.related_specialties]
      );
      diseaseCount++;
    }
  }

  const guidelines = [
    { title: 'Management of Hypertension in Adults', description: 'Evidence-based guidelines for screening, diagnosis, and treatment of hypertension in adult populations.', type: 'national', category: 'Cardiovascular', authority: 'Bangladesh Medical and Dental Council', publication_date: '2020-01-15', link: 'https://bmdc.org.bd/guidelines' },
    { title: 'Diabetes Prevention and Management', description: 'Comprehensive guidelines for prevention, screening, and management of diabetes mellitus types 1 and 2.', type: 'international', category: 'Endocrine', authority: 'World Health Organization (WHO)', publication_date: '2021-06-10', link: 'https://who.int/diabetes' },
    { title: 'Asthma Management Guidelines', description: 'Stepwise approach to asthma diagnosis, treatment, and control based on severity and control levels.', type: 'international', category: 'Respiratory', authority: 'Global Initiative for Asthma (GINA)', publication_date: '2022-11-01', link: 'https://ginasthma.org' },
    { title: 'GERD Treatment and Lifestyle Modifications', description: 'Clinical practice guidelines for the management of gastroesophageal reflux disease in primary and secondary care.', type: 'national', category: 'Gastric', authority: 'Bangladesh Society of Gastroenterology', publication_date: '2019-03-20', link: 'https://bdsg.org.bd' },
    { title: 'Community-Acquired Pneumonia Management', description: 'Guidelines for diagnosis, investigation, and antimicrobial therapy of community-acquired pneumonia.', type: 'international', category: 'Respiratory', authority: 'American Thoracic Society', publication_date: '2021-02-14', link: 'https://ats.org' }
  ];

  let guidelineCount = 0;
  for (const g of guidelines) {
    const exists = getOne('SELECT id FROM guidelines WHERE title = ?', [g.title]);
    if (!exists) {
      runQuery(
        'INSERT INTO guidelines (title, description, type, category, authority, publication_date, link) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [g.title, g.description, g.type, g.category, g.authority, g.publication_date, g.link]
      );
      guidelineCount++;
    }
  }

  const investigations = [
    { name: 'Dhaka Diagnostic Center', location: 'Dhanmondi', address: '456 Satmasjid Road, Dhanmondi, Dhaka 1205', available_tests: 'Blood tests, ECG, Ultrasound, Endoscopy, CT scan, MRI, X-ray', contact: '+880-2-9666999', opening_hours: 'Monday-Sunday: 8 AM - 8 PM' },
    { name: 'LabCare Bangladesh', location: 'Gulshan', address: '78 Gulshan Avenue, Gulshan 2, Dhaka 1212', available_tests: 'Complete blood count, Biochemistry, Hormone tests, Genetic testing, Pathology', contact: '+880-2-9858585', opening_hours: 'Monday-Sunday: 7 AM - 9 PM' },
    { name: 'Chittagong Medical Diagnostics', location: 'Chittagong', address: '123 Agrabad Commercial Area, Chittagong 4000', available_tests: 'X-ray, Ultrasound, ECG, Blood tests, Endoscopy, Colonoscopy', contact: '+880-31-2866666', opening_hours: 'Monday-Friday: 8 AM - 6 PM, Saturday-Sunday: 9 AM - 4 PM' },
    { name: 'Sylhet Path Lab', location: 'Sylhet', address: '89 Medical Road, Sylhet 3100', available_tests: 'Blood tests, Urine tests, Culture and sensitivity, Histopathology', contact: '+880-821-714523', opening_hours: 'Monday-Sunday: 8 AM - 7 PM' },
    { name: 'Rajshahi Imaging Center', location: 'Rajshahi', address: '234 Motihar Road, Rajshahi 6000', available_tests: 'CT scan, MRI, Ultrasound, X-ray, Echocardiography', contact: '+880-721-774444', opening_hours: 'Monday-Friday: 9 AM - 5 PM, Saturday: 10 AM - 2 PM' }
  ];

  let investigationCount = 0;
  for (const inv of investigations) {
    const exists = getOne('SELECT id FROM investigation_centers WHERE name = ?', [inv.name]);
    if (!exists) {
      runQuery(
        'INSERT INTO investigation_centers (name, location, address, available_tests, contact, opening_hours) VALUES (?, ?, ?, ?, ?, ?)',
        [inv.name, inv.location, inv.address, inv.available_tests, inv.contact, inv.opening_hours]
      );
      investigationCount++;
    }
  }

  saveDb();

  const totalMeds = getOne('SELECT COUNT(*) as c FROM medicines');
  const totalDocs = getOne('SELECT COUNT(*) as c FROM doctors');
  const totalDiseases = getOne('SELECT COUNT(*) as c FROM diseases');
  const totalGuidelines = getOne('SELECT COUNT(*) as c FROM guidelines');
  const totalInvestigations = getOne('SELECT COUNT(*) as c FROM investigation_centers');

  if (medCount > 0 || docCount > 0 || diseaseCount > 0 || guidelineCount > 0 || investigationCount > 0) {
    console.log(`Seeded ${medCount} new medicines, ${docCount} new doctors, ${diseaseCount} new diseases, ${guidelineCount} new guidelines, and ${investigationCount} new investigation centers.`);
  } else {
    console.log('Database already has seed data — no new records inserted.');
  }
  console.log(`Total: ${totalMeds.c} medicines, ${totalDocs.c} doctors, ${totalDiseases.c} diseases, ${totalGuidelines.c} guidelines, ${totalInvestigations.c} investigation centers.`);
}

if (require.main === module) {
  seed().then(() => setTimeout(() => process.exit(0), 100)).catch(err => {
    console.error('Seed failed:', err);
    setTimeout(() => process.exit(1), 100);
  });
}

module.exports = { seed };
