require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initDatabase, runQuery, getOne, saveDb } = require('./setup');

async function seed() {
  await initDatabase();

  const MEDICINES_DATA = [
  {
    name: 'Aceclofenac',
    generic_name: 'Aceclofenac',
    uses: 'Relief of pain and inflammation in osteoarthritis, rheumatoid arthritis, ankylosing spondylitis, dental pain, post-traumatic pain, low back pain, and gynecological pain.',
    dosage: 'Adults: 100mg twice daily orally. Extended Release: 200mg once daily. Should be taken with food or immediately after meals.',
    side_effects: 'Dyspepsia, abdominal pain, nausea, diarrhea, dizziness, pruritus, rash. Potentially serious: GI bleeding, nephrotoxicity, blood dyscrasias.',
    warnings: 'Increased risk of heart attack and stroke. Risk of serious GI bleeding and ulceration, especially in elderly. Monitor liver function. Avoid in third trimester of pregnancy. Contraindicated in patients with aspirin/NSAID allergy.',
    category: 'Pain Relief'
  },
  {
    name: 'Amoxicillin',
    generic_name: 'Amoxicillin',
    uses: 'Treatment of susceptible infections including ear, nose, throat, genitourinary tract, skin and soft tissue, lower respiratory tract infections. Also used for H. pylori eradication and dental abscess.',
    dosage: 'Adults: 250-500mg every 8 hours or 500-875mg every 12 hours. Children: 20-45mg/kg/day in divided doses. Severe infections may require higher doses.',
    side_effects: 'Diarrhea, nausea, skin rash, vomiting. Serious: anaphylaxis, Stevens-Johnson syndrome, pseudomembranous colitis, hepatic dysfunction.',
    warnings: 'Check for penicillin allergy before use. Complete full course of antibiotics. May reduce effectiveness of oral contraceptives. Use with caution in renal impairment. Monitor for superinfection.',
    category: 'Antibiotic'
  },
  {
    name: 'Amlodipine',
    generic_name: 'Amlodipine Besylate',
    uses: 'Treatment of hypertension (high blood pressure) and chronic stable angina. May be used alone or in combination with other antihypertensive agents.',
    dosage: 'Adults: Initially 5mg once daily, may increase to 10mg once daily. Elderly or hepatic impairment: Start with 2.5mg once daily.',
    side_effects: 'Peripheral edema, headache, dizziness, flushing, fatigue, palpitations, somnolence, nausea, abdominal pain.',
    warnings: 'May worsen angina or cause acute MI on initiation or dose increase. Use with caution in severe aortic stenosis, heart failure, and hepatic impairment. Do not stop abruptly.',
    category: 'Cardiovascular'
  },
  {
    name: 'Azithromycin',
    generic_name: 'Azithromycin',
    uses: 'Treatment of mild to moderate infections: acute bacterial exacerbations of COPD, community-acquired pneumonia, pharyngitis/tonsillitis, uncomplicated skin infections, urethritis, cervicitis.',
    dosage: 'Adults: 500mg on Day 1, then 250mg daily on Days 2-5. Or 500mg daily for 3 days. Community-acquired pneumonia: 500mg Day 1, then 250mg Days 2-5.',
    side_effects: 'Diarrhea, nausea, abdominal pain, vomiting, headache, dizziness. Serious: QT prolongation, hepatotoxicity, Clostridium difficile-associated diarrhea.',
    warnings: 'May prolong QT interval — avoid in patients with known QT prolongation. Monitor liver function. Complete full course. Not recommended with ergot derivatives.',
    category: 'Antibiotic'
  },
  {
    name: 'Atenolol',
    generic_name: 'Atenolol',
    uses: 'Management of hypertension, angina pectoris, cardiac arrhythmias, myocardial infarction (early intervention and long-term prevention).',
    dosage: 'Hypertension: 25-50mg once daily, may increase to 100mg daily. Angina: 50-100mg once daily. Post-MI: 50mg twice daily or 100mg once daily.',
    side_effects: 'Cold extremities, fatigue, bradycardia, dizziness, nausea, diarrhea, sleep disturbances.',
    warnings: 'Do not stop abruptly — may cause rebound hypertension or angina. Use with caution in diabetes (may mask hypoglycemia symptoms). Contraindicated in severe bradycardia, heart block, uncontrolled heart failure.',
    category: 'Cardiovascular'
  },
  {
    name: 'Atorvastatin',
    generic_name: 'Atorvastatin Calcium',
    uses: 'Treatment of hyperlipidemia and mixed dyslipidemia. Prevention of cardiovascular disease in high-risk patients. Reduces total cholesterol, LDL, triglycerides.',
    dosage: 'Adults: Initial 10-20mg once daily. Range: 10-80mg daily. Adjust dose at intervals of 4 weeks or more. Take at any time of day, with or without food.',
    side_effects: 'Nasopharyngitis, arthralgia, diarrhea, pain in extremity, urinary tract infection, dyspepsia, nausea, musculoskeletal pain, muscle spasms, insomnia.',
    warnings: 'Monitor liver function before and during treatment. Report unexplained muscle pain, tenderness, or weakness immediately (risk of rhabdomyolysis). Contraindicated in pregnancy and breastfeeding.',
    category: 'Cardiovascular'
  },
  {
    name: 'Calcium Carbonate + Vitamin D',
    generic_name: 'Calcium Carbonate + Cholecalciferol (Vitamin D3)',
    uses: 'Prevention and treatment of calcium and vitamin D deficiency. Osteoporosis prevention and treatment. Supplement during pregnancy and lactation.',
    dosage: 'Adults: 500-1000mg calcium with 200-800 IU vitamin D3 daily. Take with meals for better absorption. Chewable tablets should be chewed before swallowing.',
    side_effects: 'Constipation, flatulence, nausea, abdominal pain, diarrhea, hypercalcemia with excessive use.',
    warnings: 'Avoid in hypercalcemia, hypercalciuria, and severe renal impairment. Do not exceed recommended dose. May interact with tetracyclines, bisphosphonates, and thyroid hormones — take 2 hours apart.',
    category: 'Vitamins'
  },
  {
    name: 'Cefixime',
    generic_name: 'Cefixime',
    uses: 'Treatment of uncomplicated urinary tract infections, otitis media, pharyngitis, tonsillitis, acute bronchitis, acute exacerbations of chronic bronchitis, uncomplicated gonorrhea.',
    dosage: 'Adults: 400mg daily as a single dose or 200mg twice daily. Children >6 months: 8mg/kg/day as single dose or divided into 2 doses. Duration: 7-14 days.',
    side_effects: 'Diarrhea, abdominal pain, nausea, dyspepsia, flatulence, headache. Serious: pseudomembranous colitis, hypersensitivity reactions.',
    warnings: 'Cross-sensitivity with penicillin allergy possible. Complete full antibiotic course. Adjust dose in renal impairment. May cause false-positive urine glucose tests.',
    category: 'Antibiotic'
  },
  {
    name: 'Cefuroxime',
    generic_name: 'Cefuroxime Axetil',
    uses: 'Treatment of upper and lower respiratory tract infections, urinary tract infections, skin and soft tissue infections, gonorrhea, Lyme disease, otitis media, sinusitis.',
    dosage: 'Adults: 250-500mg twice daily. Urinary tract infections: 125-250mg twice daily. Gonorrhea: 1g single dose. Take with food for better absorption.',
    side_effects: 'Diarrhea, nausea, vomiting, headache, dizziness. Serious: pseudomembranous colitis, Stevens-Johnson syndrome, seizures (in renal impairment).',
    warnings: 'Caution in penicillin-allergic patients. Adjust dose in renal impairment. Complete full course. May interfere with blood glucose monitoring.',
    category: 'Antibiotic'
  },
  {
    name: 'Cetirizine',
    generic_name: 'Cetirizine Hydrochloride',
    uses: 'Relief of symptoms associated with seasonal and perennial allergic rhinitis. Treatment of chronic idiopathic urticaria (hives). Allergic conjunctivitis.',
    dosage: 'Adults and children ≥12 years: 10mg once daily. Children 6-11 years: 5-10mg daily. Children 2-5 years: 2.5mg daily, may increase to 5mg.',
    side_effects: 'Somnolence (drowsiness), headache, dry mouth, fatigue, pharyngitis, dizziness, nausea, abdominal pain.',
    warnings: 'May cause drowsiness — caution when driving. Adjust dose in renal and hepatic impairment. Avoid alcohol. Use with caution in elderly patients.',
    category: 'Allergy'
  },
  {
    name: 'Ciprofloxacin',
    generic_name: 'Ciprofloxacin Hydrochloride',
    uses: 'Treatment of urinary tract infections, lower respiratory tract infections, skin and soft tissue infections, bone and joint infections, infectious diarrhea, typhoid fever, gonorrhea.',
    dosage: 'Adults: 250-750mg twice daily for 7-14 days depending on infection. UTI: 250-500mg twice daily. Take with plenty of water, 2 hours before or after antacids.',
    side_effects: 'Nausea, diarrhea, vomiting, abdominal pain, headache, dizziness, rash, restlessness. Serious: tendon rupture, peripheral neuropathy, CNS effects.',
    warnings: 'Risk of tendon inflammation and rupture (especially in elderly and those on corticosteroids). May cause photosensitivity — avoid excessive sun. Avoid in pregnancy and children. May worsen myasthenia gravis.',
    category: 'Antibiotic'
  },
  {
    name: 'Clarithromycin',
    generic_name: 'Clarithromycin',
    uses: 'Treatment of upper and lower respiratory tract infections, skin and soft tissue infections, H. pylori eradication (combination therapy), MAC infection prophylaxis in HIV patients.',
    dosage: 'Adults: 250-500mg twice daily for 7-14 days. H. pylori: 500mg twice daily for 7-14 days with other agents. Children: 7.5mg/kg twice daily.',
    side_effects: 'Diarrhea, nausea, vomiting, abdominal pain, headache, taste disturbance. Serious: QT prolongation, hepatotoxicity, pseudomembranous colitis.',
    warnings: 'May prolong QT interval. Avoid with certain drugs (ergotamine, pimozide, cisapride). Monitor liver function. Adjust dose in severe renal impairment. Not recommended in pregnancy.',
    category: 'Antibiotic'
  },
  {
    name: 'Clonazepam',
    generic_name: 'Clonazepam',
    uses: 'Treatment of epilepsy (absence seizures, myoclonic seizures, akinetic seizures). Panic disorder with or without agoraphobia. Status epilepticus.',
    dosage: 'Epilepsy Adults: Initial 1mg/day, increase by 0.5-1mg every 3 days. Maintenance: 4-8mg/day. Panic disorder: 0.25mg twice daily, increase to 1mg/day after 3 days.',
    side_effects: 'Drowsiness, ataxia, behavioral disturbances, dizziness, fatigue, depression. Serious: respiratory depression, dependence, withdrawal seizures.',
    warnings: 'Risk of dependence with prolonged use. Do not stop abruptly — taper gradually. Avoid alcohol. May impair driving ability. Caution in elderly, respiratory disease, hepatic impairment.',
    category: 'Neurological'
  },
  {
    name: 'Clopidogrel',
    generic_name: 'Clopidogrel Bisulfate',
    uses: 'Prevention of atherosclerotic events in patients with recent MI, recent stroke, or established peripheral arterial disease. Acute coronary syndrome management.',
    dosage: 'Adults: 75mg once daily. ACS with PCI: Loading dose 300-600mg, then 75mg daily. Take with or without food.',
    side_effects: 'Bleeding, bruising, diarrhea, abdominal pain, dyspepsia, rash, headache. Serious: GI hemorrhage, intracranial bleeding, TTP.',
    warnings: 'Increased bleeding risk — discontinue 5-7 days before surgery. Avoid with omeprazole/esomeprazole (reduced efficacy). CYP2C19 poor metabolizers may have reduced response. Contraindicated in active bleeding.',
    category: 'Cardiovascular'
  },
  {
    name: 'Dexamethasone',
    generic_name: 'Dexamethasone',
    uses: 'Anti-inflammatory and immunosuppressive conditions. Cerebral edema, allergic disorders, respiratory conditions, rheumatic disorders, COVID-19 (hospitalized patients requiring oxygen).',
    dosage: 'Varies widely by condition. Anti-inflammatory: 0.5-9mg/day in divided doses. Cerebral edema: 10mg IV initially, then 4mg IM every 6 hours. COVID-19: 6mg daily for up to 10 days.',
    side_effects: 'Weight gain, insomnia, mood changes, increased appetite, hyperglycemia, fluid retention, hypertension, osteoporosis (long-term).',
    warnings: 'Long-term use causes adrenal suppression — do not stop abruptly, taper gradually. Increases infection risk. May mask infection signs. Monitor blood glucose in diabetics. Avoid live vaccines.',
    category: 'Steroid'
  },
  {
    name: 'Diazepam',
    generic_name: 'Diazepam',
    uses: 'Management of anxiety disorders, acute alcohol withdrawal, muscle spasm relief, status epilepticus, preoperative sedation, adjunct in skeletal muscle spasm.',
    dosage: 'Anxiety: 2-10mg 2-4 times daily. Muscle spasm: 2-10mg 3-4 times daily. Status epilepticus: 5-10mg IV, may repeat. Elderly: Start with lowest effective dose.',
    side_effects: 'Drowsiness, fatigue, ataxia, confusion, depression, amnesia. Serious: respiratory depression, paradoxical reactions, dependence.',
    warnings: 'Highly addictive — use shortest duration possible. Do not stop abruptly after prolonged use. Avoid alcohol. Impairs driving. Contraindicated in severe respiratory insufficiency, sleep apnea, myasthenia gravis.',
    category: 'Neurological'
  },
  {
    name: 'Diclofenac Sodium',
    generic_name: 'Diclofenac Sodium',
    uses: 'Relief of pain and inflammation in rheumatoid arthritis, osteoarthritis, ankylosing spondylitis, acute gout, post-operative pain, dysmenorrhea, migraine.',
    dosage: 'Adults: 75-150mg/day in 2-3 divided doses. Suppository: 75-150mg daily. Topical gel: Apply 3-4 times daily. Take oral form with food.',
    side_effects: 'Epigastric pain, nausea, diarrhea, headache, dizziness, rash, elevated liver enzymes. Serious: GI ulceration/bleeding, cardiovascular events, renal impairment.',
    warnings: 'Increased cardiovascular risk with prolonged use. GI bleeding risk especially in elderly. Monitor liver and renal function. Avoid in third trimester of pregnancy. Contraindicated in aspirin/NSAID allergy.',
    category: 'Pain Relief'
  },
  {
    name: 'Domperidone',
    generic_name: 'Domperidone',
    uses: 'Relief of nausea and vomiting. Treatment of gastroparesis and dyspepsia. Helps with symptoms of delayed gastric emptying including fullness, bloating, and epigastric pain.',
    dosage: 'Adults: 10mg up to 3 times daily, taken 15-30 minutes before meals. Maximum duration: 1 week at lowest effective dose. Maximum: 30mg/day.',
    side_effects: 'Dry mouth, headache, diarrhea, dizziness, breast tenderness, galactorrhea. Serious: QT prolongation, cardiac arrhythmias (rare).',
    warnings: 'Risk of serious cardiac arrhythmias — use lowest effective dose for shortest duration. Contraindicated in hepatic impairment, cardiac conditions with QT prolongation. Avoid with CYP3A4 inhibitors.',
    category: 'Gastric'
  },
  {
    name: 'Doxycycline',
    generic_name: 'Doxycycline',
    uses: 'Treatment of respiratory tract infections, urinary tract infections, acne vulgaris, Lyme disease, malaria prophylaxis, sexually transmitted infections, rickettsial infections.',
    dosage: 'Adults: 200mg on Day 1, then 100mg once daily. Severe infections: 200mg daily throughout. Acne: 50-100mg daily for 6-12 weeks. Take with plenty of water, remain upright for 30 minutes.',
    side_effects: 'Nausea, vomiting, diarrhea, photosensitivity, esophageal irritation/ulceration, vaginal candidiasis, tooth discoloration (children).',
    warnings: 'Severe photosensitivity — avoid excessive sun and UV exposure. Do not take with milk, antacids, or iron supplements. Contraindicated in pregnancy and children under 8 years. May cause esophageal ulceration — take upright.',
    category: 'Antibiotic'
  },
  {
    name: 'Enalapril',
    generic_name: 'Enalapril Maleate',
    uses: 'Treatment of hypertension, heart failure, asymptomatic left ventricular dysfunction. Prevention of development of clinically evident heart failure in asymptomatic patients.',
    dosage: 'Hypertension: Initial 5mg once daily, usual 10-40mg daily. Heart failure: Initial 2.5mg once daily, target 10-20mg twice daily. Adjust for renal impairment.',
    side_effects: 'Dizziness, headache, fatigue, persistent dry cough, hyperkalemia, hypotension. Serious: angioedema, renal impairment.',
    warnings: 'Contraindicated in pregnancy (can cause fetal harm). Risk of angioedema — discontinue immediately if swelling of face/tongue occurs. Monitor potassium and renal function. Avoid with potassium supplements.',
    category: 'Cardiovascular'
  },
  {
    name: 'Esomeprazole',
    generic_name: 'Esomeprazole Magnesium',
    uses: 'Treatment of GERD, erosive esophagitis, duodenal ulcer, gastric ulcer, H. pylori eradication (combination therapy), NSAID-associated ulcer prevention, Zollinger-Ellison syndrome.',
    dosage: 'GERD: 20-40mg once daily for 4-8 weeks. H. pylori: 20mg twice daily for 7 days with antibiotics. Maintenance: 20mg daily. Take 1 hour before meals.',
    side_effects: 'Headache, diarrhea, nausea, flatulence, abdominal pain, constipation, dry mouth. Long-term: vitamin B12 deficiency, hypomagnesemia, bone fractures.',
    warnings: 'Long-term use increases risk of bone fractures and hypomagnesemia. Symptomatic response does not rule out malignancy. May mask symptoms of gastric cancer. Reduce dose in severe hepatic impairment.',
    category: 'Gastric'
  },
  {
    name: 'Fexofenadine',
    generic_name: 'Fexofenadine Hydrochloride',
    uses: 'Relief of symptoms of seasonal allergic rhinitis (sneezing, runny nose, itchy/watery eyes). Treatment of chronic idiopathic urticaria (hives).',
    dosage: 'Adults: 120mg once daily for allergic rhinitis or 180mg once daily for urticaria. Children 6-11 years: 30mg twice daily. Take with water, avoid fruit juices.',
    side_effects: 'Headache, drowsiness (less than other antihistamines), nausea, dizziness, fatigue, dysmenorrhea, back pain.',
    warnings: 'Avoid taking with fruit juices (grapefruit, orange, apple) as they reduce absorption. Adjust dose in renal impairment. Generally non-sedating but some drowsiness possible.',
    category: 'Allergy'
  },
  {
    name: 'Fluconazole',
    generic_name: 'Fluconazole',
    uses: 'Treatment of candidiasis (vaginal, oropharyngeal, esophageal, systemic), cryptococcal meningitis, prevention of fungal infections in immunocompromised patients.',
    dosage: 'Vaginal candidiasis: 150mg single dose. Oropharyngeal: 200mg Day 1, then 100mg daily for 7-14 days. Systemic: 200-400mg daily. Adjust for renal impairment.',
    side_effects: 'Nausea, headache, abdominal pain, diarrhea, rash, vomiting, dizziness. Serious: hepatotoxicity, QT prolongation, Stevens-Johnson syndrome (rare).',
    warnings: 'Monitor liver function during prolonged treatment. May prolong QT interval. Significant drug interactions with warfarin, phenytoin, rifampin, and cyclosporine. Avoid in pregnancy (teratogenic in high doses).',
    category: 'Antifungal'
  },
  {
    name: 'Fluticasone Nasal Spray',
    generic_name: 'Fluticasone Propionate Nasal',
    uses: 'Treatment of seasonal and perennial allergic rhinitis. Management of nasal polyps. Relief of nasal congestion, sneezing, runny nose, and itching.',
    dosage: 'Adults: 2 sprays in each nostril once daily (200mcg/day), may reduce to 1 spray per nostril. Children ≥4 years: 1 spray per nostril once daily.',
    side_effects: 'Nasal irritation, headache, nosebleeds (epistaxis), pharyngitis, nasal dryness, sneezing after application, unpleasant taste.',
    warnings: 'Not for immediate relief of acute symptoms. May take several days for full effect. Prolonged use may affect growth in children — use lowest effective dose. Monitor for nasal septum perforation.',
    category: 'Respiratory'
  },
  {
    name: 'Gabapentin',
    generic_name: 'Gabapentin',
    uses: 'Treatment of epilepsy (partial seizures with or without secondary generalization). Management of neuropathic pain. Post-herpetic neuralgia.',
    dosage: 'Epilepsy: Start 300mg on Day 1, 300mg twice daily on Day 2, 300mg three times daily on Day 3. Usual: 900-3600mg/day. Neuropathic pain: 300-1800mg/day in divided doses.',
    side_effects: 'Somnolence, dizziness, ataxia, fatigue, peripheral edema, weight gain, nausea, blurred vision. Serious: suicidal ideation, respiratory depression.',
    warnings: 'Do not discontinue abruptly — taper over 1 week minimum. Risk of suicidal thoughts — monitor closely. Adjust dose for renal impairment. May cause dizziness and drowsiness — caution with driving.',
    category: 'Neurological'
  },
  {
    name: 'Glimepiride',
    generic_name: 'Glimepiride',
    uses: 'Treatment of type 2 diabetes mellitus as adjunct to diet and exercise. May be used alone or in combination with metformin or insulin.',
    dosage: 'Initial: 1-2mg once daily with breakfast. Titrate by 1-2mg at 1-2 week intervals. Usual maintenance: 1-4mg once daily. Maximum: 8mg daily.',
    side_effects: 'Hypoglycemia, dizziness, headache, nausea, weight gain, weakness, blurred vision. Serious: severe hypoglycemia, hemolytic anemia, agranulocytosis (rare).',
    warnings: 'Risk of hypoglycemia — educate patient on symptoms and management. Take with breakfast. Avoid alcohol. Contraindicated in type 1 diabetes, diabetic ketoacidosis. Use with caution in hepatic/renal impairment.',
    category: 'Diabetes'
  },
  {
    name: 'Ibuprofen',
    generic_name: 'Ibuprofen',
    uses: 'Relief of mild to moderate pain, fever, inflammation. Treatment of rheumatoid arthritis, osteoarthritis, dysmenorrhea, headache, dental pain, musculoskeletal injuries.',
    dosage: 'Adults: 200-400mg every 4-6 hours as needed. Anti-inflammatory: 400-800mg 3 times daily. Maximum: 3200mg/day. Take with food or milk.',
    side_effects: 'Nausea, dyspepsia, diarrhea, dizziness, headache, rash, fluid retention. Serious: GI bleeding/ulceration, cardiovascular events, renal impairment.',
    warnings: 'Increased cardiovascular risk with prolonged use. GI bleeding risk especially in elderly. Avoid in third trimester of pregnancy. Contraindicated in aspirin/NSAID allergy, active peptic ulcer. Take with food.',
    category: 'Pain Relief'
  },
  {
    name: 'Insulin (Premixed 70/30)',
    generic_name: 'Insulin Human (70% NPH / 30% Regular)',
    uses: 'Treatment of diabetes mellitus (type 1 and type 2) requiring insulin therapy for glycemic control.',
    dosage: 'Individualized based on blood glucose monitoring. Usually injected subcutaneously 15-30 minutes before meals, typically twice daily. Rotate injection sites.',
    side_effects: 'Hypoglycemia, injection site reactions, lipodystrophy, weight gain, peripheral edema, allergic reactions.',
    warnings: 'Never inject intravenously. Monitor blood glucose regularly. Hypoglycemia risk increases with exercise, missed meals, or excessive dosing. Store unopened vials in refrigerator. Do not freeze.',
    category: 'Diabetes'
  },
  {
    name: 'Ketoconazole Topical',
    generic_name: 'Ketoconazole 2% Cream/Shampoo',
    uses: 'Treatment of fungal skin infections including tinea corporis, tinea cruris, tinea pedis, cutaneous candidiasis, pityriasis versicolor, seborrheic dermatitis, dandruff.',
    dosage: 'Cream: Apply once or twice daily to affected area for 2-6 weeks. Shampoo: Use twice weekly for 2-4 weeks for dandruff, then once weekly for maintenance.',
    side_effects: 'Local irritation, itching, burning sensation, dry skin, contact dermatitis, hair texture changes (shampoo).',
    warnings: 'For external use only. Avoid contact with eyes. If irritation or sensitivity develops, discontinue use. Not recommended for nail fungus. Consult doctor if no improvement after 4 weeks.',
    category: 'Antifungal'
  },
  {
    name: 'Levofloxacin',
    generic_name: 'Levofloxacin',
    uses: 'Treatment of community-acquired pneumonia, acute bacterial sinusitis, complicated urinary tract infections, acute pyelonephritis, skin infections, chronic bacterial prostatitis.',
    dosage: 'Adults: 250-750mg once daily for 5-14 days depending on infection type. CAP: 500mg daily for 7-14 days. UTI: 250-750mg daily for 5-14 days.',
    side_effects: 'Nausea, diarrhea, headache, insomnia, dizziness, constipation. Serious: tendon rupture, peripheral neuropathy, CNS effects, QT prolongation, aortic disorders.',
    warnings: 'Black box warning: risk of tendinitis and tendon rupture, peripheral neuropathy, CNS effects. Avoid in myasthenia gravis. Photosensitivity — avoid sun exposure. Contraindicated in pregnancy.',
    category: 'Antibiotic'
  },
  {
    name: 'Levothyroxine',
    generic_name: 'Levothyroxine Sodium',
    uses: 'Treatment of hypothyroidism. Thyroid hormone replacement therapy. TSH suppression in thyroid cancer. Treatment of myxedema coma.',
    dosage: 'Adults: Start 25-50mcg daily, increase by 25mcg every 4-6 weeks. Usual: 100-200mcg daily. Take on empty stomach, 30-60 minutes before breakfast.',
    side_effects: 'Usually due to overdose: palpitations, tachycardia, tremor, headache, insomnia, sweating, weight loss, diarrhea, menstrual irregularities.',
    warnings: 'Should not be used for weight loss. Requires regular thyroid function monitoring. Do not take with calcium, iron, or antacids (separate by 4 hours). Adjust dose gradually in elderly and cardiac patients.',
    category: 'Endocrine'
  },
  {
    name: 'Losartan',
    generic_name: 'Losartan Potassium',
    uses: 'Treatment of hypertension. Reduction of stroke risk in hypertensive patients with LVH. Treatment of diabetic nephropathy with elevated serum creatinine and proteinuria.',
    dosage: 'Hypertension: Start 50mg once daily, may increase to 100mg daily. Diabetic nephropathy: Start 50mg daily, increase to 100mg daily. May be taken with or without food.',
    side_effects: 'Dizziness, upper respiratory infection, nasal congestion, back pain, fatigue, diarrhea, hyperkalemia, hypotension.',
    warnings: 'Contraindicated in pregnancy — can cause fetal injury/death. Monitor potassium and renal function. Risk of hypotension, especially with volume depletion. Do not use with aliskiren in diabetes.',
    category: 'Cardiovascular'
  },
  {
    name: 'Loperamide',
    generic_name: 'Loperamide Hydrochloride',
    uses: 'Symptomatic treatment of acute and chronic diarrhea. Control of ileostomy discharge.',
    dosage: 'Acute diarrhea Adults: 4mg initially, then 2mg after each loose stool. Maximum: 16mg/day. Children 8-12 years: 2mg initially, max 6mg/day. Discontinue if no improvement in 48 hours.',
    side_effects: 'Constipation, abdominal cramps, dizziness, nausea, dry mouth, drowsiness, skin rash.',
    warnings: 'Do not use in acute dysentery, bacterial enterocolitis, or pseudomembranous colitis. Discontinue if abdominal distension occurs. Do not exceed recommended dose — cardiac toxicity risk with overdose.',
    category: 'Gastric'
  },
  {
    name: 'Mefenamic Acid',
    generic_name: 'Mefenamic Acid',
    uses: 'Short-term relief of mild to moderate pain including headache, dental pain, dysmenorrhea (menstrual cramps), musculoskeletal pain, postoperative pain.',
    dosage: 'Adults: 500mg initially, then 250mg every 6 hours as needed. Maximum duration: 7 days. Take with food. Children >14 years: Same as adult dose.',
    side_effects: 'Diarrhea (sometimes severe), nausea, vomiting, abdominal pain, headache, dizziness, drowsiness, rash. Serious: GI bleeding, hemolytic anemia.',
    warnings: 'Limit use to 7 days maximum. Discontinue if diarrhea develops. Risk of GI bleeding especially in elderly. Contraindicated in inflammatory bowel disease, renal impairment, aspirin allergy.',
    category: 'Pain Relief'
  },
  {
    name: 'Metformin',
    generic_name: 'Metformin Hydrochloride',
    uses: 'First-line pharmacological treatment for type 2 diabetes mellitus. Reduces hepatic glucose production, increases insulin sensitivity, and decreases intestinal absorption of glucose.',
    dosage: 'Start 500mg once or twice daily with meals. Increase by 500mg weekly. Usual: 1500-2000mg/day in divided doses. Maximum: 2550mg/day (or 2000mg for extended-release).',
    side_effects: 'Nausea, vomiting, diarrhea, abdominal pain, flatulence, metallic taste, decreased appetite, vitamin B12 deficiency with long-term use.',
    warnings: 'Risk of lactic acidosis — contraindicated in renal impairment (eGFR <30). Discontinue before iodinated contrast procedures. Monitor renal function and vitamin B12. Avoid excessive alcohol.',
    category: 'Diabetes'
  },
  {
    name: 'Metoprolol',
    generic_name: 'Metoprolol Tartrate / Succinate',
    uses: 'Treatment of hypertension, angina pectoris, heart failure, cardiac arrhythmias, myocardial infarction (early and long-term), migraine prophylaxis.',
    dosage: 'Hypertension: 50-100mg twice daily (tartrate) or 25-200mg once daily (succinate). Heart failure: Start 12.5-25mg daily, titrate every 2 weeks. Post-MI: 50mg every 6 hours for 48 hours.',
    side_effects: 'Fatigue, dizziness, bradycardia, hypotension, cold extremities, diarrhea, nausea, depression, sleep disturbances, shortness of breath.',
    warnings: 'Do not stop abruptly — taper over 1-2 weeks. May mask hypoglycemia in diabetics. Use with caution in asthma/COPD, severe peripheral arterial disease. Contraindicated in severe bradycardia, cardiogenic shock.',
    category: 'Cardiovascular'
  },
  {
    name: 'Montelukast',
    generic_name: 'Montelukast Sodium',
    uses: 'Prophylaxis and chronic treatment of asthma. Relief of symptoms of seasonal and perennial allergic rhinitis. Prevention of exercise-induced bronchospasm.',
    dosage: 'Adults: 10mg once daily in the evening. Children 6-14 years: 5mg chewable tablet daily. Children 2-5 years: 4mg chewable tablet or granules daily.',
    side_effects: 'Headache, abdominal pain, fatigue, dizziness, upper respiratory infection, cough, fever. Serious: neuropsychiatric events (see warnings).',
    warnings: 'BLACK BOX WARNING: Serious neuropsychiatric events including agitation, depression, sleep disturbances, suicidal thinking reported. Not for acute bronchospasm. Monitor for mood/behavior changes.',
    category: 'Respiratory'
  },
  {
    name: 'Omeprazole',
    generic_name: 'Omeprazole',
    uses: 'Treatment of GERD, duodenal ulcer, gastric ulcer, erosive esophagitis, H. pylori eradication (combination therapy), NSAID-associated ulcer, Zollinger-Ellison syndrome.',
    dosage: 'GERD: 20mg once daily for 4-8 weeks. Duodenal ulcer: 20mg daily for 4 weeks. H. pylori: 20mg twice daily with antibiotics for 7-14 days. Take 30-60 minutes before meals.',
    side_effects: 'Headache, diarrhea, abdominal pain, nausea, vomiting, flatulence, dizziness. Long-term: vitamin B12 deficiency, hypomagnesemia, bone fractures, C. difficile infection.',
    warnings: 'Long-term use increases fracture risk. May mask gastric malignancy symptoms. Risk of C. difficile-associated diarrhea. Monitor magnesium levels in prolonged use. Interacts with clopidogrel (reduces efficacy).',
    category: 'Gastric'
  },
  {
    name: 'Ondansetron',
    generic_name: 'Ondansetron',
    uses: 'Prevention and treatment of nausea and vomiting associated with chemotherapy, radiation therapy, and surgery.',
    dosage: 'Post-operative: 4mg IV/IM before anesthesia or 16mg orally 1 hour before. Chemotherapy: 8mg 30 minutes before, then 8mg every 12 hours for 1-2 days. Children ≥4 years: 4mg per dose.',
    side_effects: 'Headache, constipation, diarrhea, dizziness, drowsiness, fatigue. Serious: QT prolongation, serotonin syndrome (with serotonergic drugs), anaphylaxis (rare).',
    warnings: 'ECG monitoring recommended in electrolyte abnormalities, heart failure, or concurrent QT-prolonging drugs. May mask progressive ileus or gastric distension. Adjust dose in severe hepatic impairment.',
    category: 'Gastric'
  },
  {
    name: 'Pantoprazole',
    generic_name: 'Pantoprazole Sodium',
    uses: 'Short-term treatment of erosive esophagitis associated with GERD. Maintenance of healing of erosive esophagitis. Pathological hypersecretory conditions including Zollinger-Ellison syndrome.',
    dosage: 'Erosive esophagitis: 40mg once daily for 4-8 weeks. Maintenance: 40mg daily. ZES: Start 40mg twice daily, adjust based on acid output. IV: 40mg once daily.',
    side_effects: 'Headache, diarrhea, nausea, abdominal pain, flatulence, dizziness, joint pain. Long-term: bone fractures, hypomagnesemia, vitamin B12 deficiency.',
    warnings: 'Symptomatic response does not exclude malignancy. Long-term use may cause hypomagnesemia and increase fracture risk. Risk of C. difficile infection. Interacts with methotrexate (increased levels).',
    category: 'Gastric'
  },
  {
    name: 'Paracetamol (Acetaminophen)',
    generic_name: 'Paracetamol (Acetaminophen)',
    uses: 'Relief of mild to moderate pain including headache, toothache, backache, muscle pain, menstrual pain, arthritis pain. Reduction of fever.',
    dosage: 'Adults: 500mg-1000mg every 4-6 hours as needed. Maximum: 4000mg/day (3000mg/day for chronic use or liver disease). Children: 10-15mg/kg every 4-6 hours, max 5 doses/day.',
    side_effects: 'Generally well tolerated at recommended doses. Rare: allergic reactions, skin rash. Overdose: severe hepatotoxicity, potentially fatal liver failure.',
    warnings: 'Hepatotoxicity risk with overdose or chronic alcohol use — do not exceed 4g/day. Avoid with other paracetamol-containing products. Reduce dose in hepatic impairment. Chronic heavy alcohol users should limit to 2g/day.',
    category: 'Pain Relief'
  },
  {
    name: 'Prednisolone',
    generic_name: 'Prednisolone',
    uses: 'Anti-inflammatory and immunosuppressive therapy. Treatment of asthma exacerbations, allergic disorders, autoimmune conditions, nephrotic syndrome, inflammatory bowel disease, certain cancers.',
    dosage: 'Varies by condition. General: 5-60mg/day. Asthma exacerbation: 40-60mg/day for 5-7 days. Autoimmune: 1-2mg/kg/day initially, taper to lowest effective dose.',
    side_effects: 'Weight gain, mood changes, insomnia, increased appetite, hyperglycemia, fluid retention, hypertension, acne, easy bruising. Long-term: osteoporosis, cataracts, adrenal suppression.',
    warnings: 'Do not stop abruptly after prolonged use — taper gradually. Increases infection risk. May worsen diabetes, hypertension, peptic ulcer. Avoid live vaccines. Monitor growth in children.',
    category: 'Steroid'
  },
  {
    name: 'Rabeprazole',
    generic_name: 'Rabeprazole Sodium',
    uses: 'Treatment of GERD, duodenal ulcer, gastric ulcer, H. pylori eradication (combination therapy), NSAID-associated gastric ulcer prevention.',
    dosage: 'GERD: 20mg once daily for 4-8 weeks. Duodenal ulcer: 20mg once daily for 4 weeks. H. pylori: 20mg twice daily for 7 days with antibiotics. Take before meals.',
    side_effects: 'Headache, diarrhea, nausea, abdominal pain, flatulence, sore throat, cough. Long-term: fractures, hypomagnesemia, vitamin B12 deficiency.',
    warnings: 'Does not eliminate risk of gastric malignancy. Long-term use increases bone fracture risk. Monitor magnesium in prolonged use. Risk of C. difficile infection.',
    category: 'Gastric'
  },
  {
    name: 'Ranitidine',
    generic_name: 'Ranitidine Hydrochloride',
    uses: 'Treatment of duodenal ulcer, gastric ulcer, GERD, erosive esophagitis, Zollinger-Ellison syndrome. Prevention of stress ulcers.',
    dosage: 'Duodenal ulcer: 150mg twice daily or 300mg at bedtime for 4-8 weeks. GERD: 150mg twice daily. Maintenance: 150mg at bedtime. Children: 2-4mg/kg twice daily.',
    side_effects: 'Headache, dizziness, constipation, diarrhea, nausea, abdominal pain. Rare: hepatitis, blood disorders, bradycardia.',
    warnings: 'Note: Many ranitidine products were recalled globally due to NDMA contamination concerns. Check availability in your region. Adjust dose in renal impairment. May mask gastric cancer symptoms.',
    category: 'Gastric'
  },
  {
    name: 'Salbutamol (Albuterol)',
    generic_name: 'Salbutamol Sulfate',
    uses: 'Relief and prevention of bronchospasm in asthma, chronic bronchitis, and COPD. Prevention of exercise-induced bronchospasm.',
    dosage: 'Inhaler: 1-2 puffs (100-200mcg) every 4-6 hours as needed. Nebulizer: 2.5-5mg every 4-6 hours. Oral: 2-4mg 3-4 times daily. Maximum inhaler: 8 puffs/day.',
    side_effects: 'Tremor, headache, tachycardia, palpitations, nervousness, dizziness, nausea, throat irritation. Serious: paradoxical bronchospasm, hypokalemia.',
    warnings: 'Not for regular scheduled use without inhaled corticosteroid. Increasing need for rescue inhaler indicates worsening asthma. May cause hypokalemia — caution with diuretics. Shake inhaler before use.',
    category: 'Respiratory'
  },
  {
    name: 'Sertraline',
    generic_name: 'Sertraline Hydrochloride',
    uses: 'Treatment of major depressive disorder, panic disorder, PTSD, OCD, social anxiety disorder, premenstrual dysphoric disorder.',
    dosage: 'Depression/OCD: Start 50mg once daily, may increase by 50mg at weekly intervals. Maximum: 200mg/day. Panic/PTSD/Social anxiety: Start 25mg daily. Take in morning or evening.',
    side_effects: 'Nausea, diarrhea, insomnia, dry mouth, dizziness, fatigue, sexual dysfunction, tremor, sweating, decreased appetite.',
    warnings: 'BLACK BOX WARNING: Increased risk of suicidal thinking in children, adolescents, and young adults. Do not stop abruptly — taper gradually. Serotonin syndrome risk with MAOIs. Monitor closely during initial weeks.',
    category: 'Neurological'
  },
  {
    name: 'Tramadol',
    generic_name: 'Tramadol Hydrochloride',
    uses: 'Management of moderate to moderately severe pain. Post-operative pain. Chronic pain conditions where other analgesics are inadequate.',
    dosage: 'Adults: 50-100mg every 4-6 hours as needed. Maximum: 400mg/day. Extended-release: 100mg once daily, titrate by 100mg every 5 days. Start lower in elderly.',
    side_effects: 'Nausea, dizziness, constipation, headache, somnolence, vomiting, dry mouth, sweating, fatigue. Serious: seizures, respiratory depression, serotonin syndrome.',
    warnings: 'Risk of seizures — especially with SSRIs, MAOIs, or in epilepsy. Risk of dependence and abuse. Do not use with MAOIs. Respiratory depression risk, especially with other CNS depressants. Not recommended in children under 12.',
    category: 'Pain Relief'
  }
];

  let medCount = 0;
  for (const m of MEDICINES_DATA) {
    const exists = getOne('SELECT id FROM medicines WHERE name = ? OR generic_name = ?', [m.name, m.generic_name]);
    if (!exists) {
      runQuery(
        'INSERT INTO medicines (name, generic_name, uses, dosage, side_effects, warnings, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [m.name, m.generic_name, m.uses, m.dosage, m.side_effects, m.warnings, m.category]
      );
      medCount++;
    }
  }

  saveDb();
  console.log(`Imported ${medCount} new medicines from DIMS BD data.`);

  const totalMeds = getOne('SELECT COUNT(*) as c FROM medicines');
  console.log(`Total medicines in database: ${totalMeds.c}`);

  setTimeout(() => process.exit(0), 100);
}

seed().catch(err => {
  console.error('Import failed:', err);
  setTimeout(() => process.exit(1), 100);
});
