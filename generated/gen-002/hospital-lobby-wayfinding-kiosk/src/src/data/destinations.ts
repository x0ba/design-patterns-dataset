import type { BuildingId } from './campus';

export type Cat = 'dept' | 'clinic' | 'service' | 'amenity' | 'parking';
export type AmenityKind = 'restroom' | 'cafe' | 'pharmacy' | 'wheelchair' | 'chapel' | 'other';

export interface Destination {
  id: string;
  name: string;
  b: BuildingId;
  level: number;
  rooms: string;
  ext: string;
  hours: string; // '24' | '<days> HH:MM-HH:MM'  days: MF = Mon–Fri, MS = Mon–Sat, D = daily
  aliases: string[];
  cat: Cat;
  kind?: AmenityKind;
  side: 'A' | 'hub' | 'B';
  d: number; // metres from the lobby node to the door
}

type Row = [
  name: string,
  level: number,
  rooms: string,
  ext: string,
  hours: string,
  aliases: string,
  cat?: Cat | `amenity:${AmenityKind}`,
  side?: 'A' | 'hub' | 'B',
  d?: number,
];

const MB: Row[] = [
  // Level 1
  ['Main Lobby Information Desk', 1, 'Main lobby', '1000', 'D 07:00-20:00', 'information desk|volunteer desk|front desk|reception|help desk', 'service', 'hub', 12],
  ['Patient Registration & Admitting', 1, '110–118', '1105', 'MF 06:30-18:00', 'admitting|registration|check in|admissions|register', 'service', 'A', 30],
  ['Emergency Department', 1, '130–199', '1911', '24', 'ER|emergency room|ED|urgent|emergency', 'dept', 'B', 40],
  ['Imaging: X-ray & CT', 1, '160–178', '1250', 'MF 07:00-19:00', 'radiology|x-ray|xray|CT scan|imaging|scans', 'dept', 'B', 55],
  ['Main Laboratory & Blood Draw', 1, '120–128', '1140', 'MS 06:30-17:00', 'lab|blood work|phlebotomy|blood test|laboratory', 'service', 'A', 45],
  ['Patient Financial Services', 1, '140–142', '1180', 'MF 08:30-16:30', 'billing|bills|payments|financial counseling|pay a bill', 'service', 'hub', 35],
  ['Medical Records', 1, '144', '1186', 'MF 08:30-16:30', 'release of information|health records|chart copy|HIM', 'service', 'hub', 40],
  ['Security Office & Lost and Found', 1, '100', '1999', '24', 'security|lost and found|lost property|guard', 'service', 'A', 20],
  ['Interpreter & Language Services', 1, '104', '1030', 'MF 07:30-17:00', 'translation|translator|language help|interpreter', 'service', 'A', 25],
  ['Patient Advocate Office', 1, '106', '1034', 'MF 08:00-16:30', 'patient relations|complaints|advocate|concerns', 'service', 'A', 28],
  ['Volunteer Services', 1, '108', '1040', 'MF 08:00-16:00', 'volunteers|volunteer office|candy stripers', 'service', 'A', 30],
  ['Blood Donor Center', 1, '150–156', '1270', 'MS 08:00-16:00', 'give blood|blood bank|donate blood|donor', 'service', 'B', 35],
  ['Outpatient Registration, Main Building', 1, '112', '1108', 'MF 07:00-17:00', 'outpatient check in|appointment check in', 'service', 'A', 32],
  // Level 2
  ['Surgery Waiting Room', 2, '200–206', '1300', 'D 05:30-21:00', 'surgical waiting|family waiting room|OR waiting', 'service', 'hub', 20],
  ['Pre-Surgical Testing', 2, '210–220', '1310', 'MF 07:00-16:00', 'pre-op|preadmission testing|pre admission|PAT', 'clinic', 'A', 30],
  ['Same-Day Surgery Unit', 2, '230–248', '1330', 'MF 05:30-18:00', 'ambulatory surgery|outpatient surgery|day surgery', 'dept', 'hub', 45],
  ['Gastroenterology & Endoscopy', 2, '250–274', '1360', 'MF 07:00-16:30', 'GI|endoscopy|colonoscopy|digestive|stomach doctor', 'clinic', 'B', 40],
  ['Pain Management Clinic', 2, '276–288', '1372', 'MF 08:00-16:30', 'pain clinic|back pain|pain doctor', 'clinic', 'B', 55],
  ['Social Work & Case Management', 2, '290–294', '1395', 'MF 08:00-17:00', 'social worker|case manager|discharge planning', 'service', 'A', 55],
  ['Discharge Lounge', 2, '296', '1398', 'D 09:00-19:00', 'going home lounge|discharge waiting', 'service', 'A', 60],
  ['Ear, Nose & Throat Clinic', 2, '240–246', '1340', 'MF 08:00-16:30', 'ENT|otolaryngology|hearing|sinus', 'clinic', 'hub', 30],
  ['Urology Clinic', 2, '252–258', '1366', 'MF 08:00-16:30', 'urologist|kidney stones|prostate', 'clinic', 'B', 30],
  // Level 3
  ['Intensive Care Unit (ICU)', 3, '300–340', '1500', '24', 'ICU|critical care|intensive care', 'dept', 'hub', 40],
  ['Neuro Intensive Care Unit', 3, '342–358', '1510', '24', 'neuro ICU|NICU adult|neurological critical care', 'dept', 'B', 40],
  ['Medical Unit 3 East', 3, '360–398', '1530', 'D 10:00-20:00', 'inpatient 3E|3 East|visiting 3E', 'dept', 'B', 55],
  ['Surgical Unit 3 West', 3, '301–339', '1540', 'D 10:00-20:00', 'inpatient 3W|3 West|post-surgery floor', 'dept', 'A', 50],
  ['Neurology Clinic', 3, '350–372', '1580', 'MF 08:00-16:30', 'neurologist|headaches|seizures|memory clinic', 'clinic', 'hub', 45],
  ['Neurosurgery Clinic', 3, '374–382', '1586', 'MF 08:00-16:30', 'brain surgery|spine surgery|neurosurgeon', 'clinic', 'B', 35],
  ['Infusion Center', 3, '310–328', '1560', 'MF 07:00-17:30', 'chemo|infusion|IV therapy|chemotherapy', 'dept', 'A', 40],
  ['Oncology Clinic', 3, '330–348', '1566', 'MF 08:00-17:00', 'cancer clinic|oncologist|cancer center', 'clinic', 'hub', 35],
  ['Palliative Care Team', 3, '390', '1599', 'MF 08:00-16:30', 'comfort care|supportive care', 'service', 'B', 70],
  // Level 4
  ['Medical Library', 4, '400–412', '1700', 'MF 08:00-18:00', 'library|books|journals', 'service', 'A', 30],
  ['Grand Rounds Auditorium', 4, '420', '1710', 'MF 07:00-17:00', 'lecture hall|auditorium|conference hall', 'service', 'hub', 30],
  ['Simulation & Education Center', 4, '430–458', '1720', 'MF 07:30-17:00', 'sim lab|resident training|teaching center', 'service', 'B', 40],
  ['Medical Staff Office', 4, '460', '1735', 'MF 08:00-16:30', 'credentialing|doctors office|physician services', 'service', 'B', 60],
  ['Clinical Research Unit', 4, '470–484', '1740', 'MF 07:30-17:00', 'clinical trials|research studies|research', 'dept', 'B', 50],
  ['Hospital Administration', 4, '490–498', '1750', 'MF 08:00-17:00', 'executive offices|CEO|administration offices', 'service', 'A', 60],
  ['Pathology Department', 4, '440', '1760', 'MF 07:00-17:00', 'pathology|biopsy results|tissue lab', 'dept', 'A', 50],
  ['Human Resources & Employee Health', 4, '402', '1770', 'MF 08:00-16:30', 'HR|jobs|careers|employee health|staff health', 'service', 'A', 38],
  // Amenities
  ['Main Street Café', 1, 'Main lobby', '1020', 'D 06:30-19:30', 'cafeteria|food|coffee|lunch|breakfast|eat|dining', 'amenity:cafe', 'B', 25],
  ['Garden Courtyard Dining Hall', 1, '180', '1024', 'D 11:00-14:30', 'cafeteria|hot lunch|dining hall|food|eat', 'amenity:cafe', 'B', 60],
  ['Main Building Pharmacy', 1, '134', '1160', 'MF 08:00-18:00', 'pharmacy|prescriptions|medicine|drug store|pick up medication', 'amenity:pharmacy', 'hub', 28],
  ['Interfaith Chapel', 1, '190', '1050', '24', 'chapel|prayer room|church|quiet room|meditation|chaplain', 'amenity:chapel', 'B', 70],
  ['Pastoral Care & Chaplain Office', 1, '192', '1052', 'D 08:00-20:00', 'chaplain|spiritual care|priest|rabbi|imam', 'service', 'B', 75],
  ['Gift Shop', 1, 'Main lobby', '1015', 'D 09:00-18:00', 'flowers|gifts|balloons|cards|newspaper', 'amenity:other', 'hub', 20],
  ['Wheelchair Loan Station, Main Entrance', 1, 'Main lobby', '1001', 'D 06:30-21:00', 'wheelchair|walker|mobility|loan chair|wheel chair', 'amenity:wheelchair', 'hub', 18],
  ['Wheelchair Loan Station, Emergency Entrance', 1, '132', '1912', '24', 'wheelchair|mobility|loan chair|wheel chair', 'amenity:wheelchair', 'B', 35],
  ['Restrooms, Main Lobby', 1, 'Main lobby', '', '24', 'toilet|bathroom|restroom|washroom|men|women|family restroom|accessible restroom', 'amenity:restroom', 'hub', 22],
  ['Restrooms, Main Building Level 2', 2, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 18],
  ['Restrooms, Main Building Level 3', 3, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 18],
  ['Restrooms, Main Building Level 4', 4, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 18],
  ['ATM, Main Lobby', 1, 'Main lobby', '', '24', 'cash machine|bank|money|cash', 'amenity:other', 'hub', 25],
  ['Family Lounge & Lactation Room, Level 3', 3, '305', '1555', '24', 'nursing room|lactation|family lounge|quiet room', 'amenity:other', 'hub', 22],
  ['Nuclear Medicine', 1, '180–186', '1260', 'MF 07:00-16:30', 'PET scan|nuclear scan|thyroid scan|bone scan', 'service', 'B', 62],
  ['Insurance & Financial Assistance Office', 1, '146', '1188', 'MF 08:30-16:30', 'insurance help|medicaid|charity care|cost estimate|payment plans', 'service', 'hub', 45],
  ['Patient Property & Valuables Office', 1, '102', '1036', 'MF 08:00-17:00', 'belongings|valuables|personal items|property', 'service', 'A', 22],
  ['Hydration Station & Vending, Level 1', 1, 'Near cafe', '', '24', 'water|drinks|snacks|vending machine|soda', 'amenity:other', 'B', 28],
  ['Restrooms, Emergency Department Waiting Area', 1, '131', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'B', 38],
  ['General Surgery Clinic', 2, '222–228', '1350', 'MF 08:00-16:30', 'surgeon|hernia|gallbladder|appendix|surgery consult', 'clinic', 'A', 40],
  ['Telehealth Support Suite', 2, '208', '1304', 'MF 08:00-17:00', 'video visit help|virtual visit|online appointment help|MyChart help', 'service', 'A', 24],
  ['Family Consultation Rooms', 2, '202–204', '1302', 'D 06:00-21:00', 'private family room|talk with doctor|family meeting room', 'service', 'hub', 22],
  ['Respiratory Therapy', 2, '299', '1399', 'MF 07:00-16:00', 'breathing treatments|oxygen therapy|inhaler help', 'service', 'B', 80],
  ['Meds-to-Beds Discharge Pharmacy', 2, '297', '1165', 'MF 09:00-17:00', 'pharmacy|discharge medications|take-home prescriptions|medicine', 'amenity:pharmacy', 'A', 58],
  ['Wheelchair Loan Station, Level 2 Elevator Lobby', 2, 'Near elevators', '1302', 'MF 07:00-19:00', 'wheelchair|walker|mobility|wheel chair', 'amenity:wheelchair', 'hub', 16],
  ['Hematology Clinic', 3, '314–318', '1570', 'MF 08:00-16:30', 'blood disorders|anemia|clotting|sickle cell', 'clinic', 'A', 48],
  ['Transplant Center', 3, '396', '1592', 'MF 08:00-16:30', 'kidney transplant|liver transplant|organ transplant', 'clinic', 'B', 68],
  ['Cancer Genetics Counseling', 3, '392', '1594', 'MF 08:30-16:00', 'genetic testing|hereditary cancer|BRCA|genetic counselor', 'service', 'B', 62],
  ['Medical Unit 4 North', 4, '404–428', '1780', 'D 10:00-20:00', '4 North|inpatient 4N|medical floor', 'dept', 'A', 48],
  ['Orthopedic Unit 4 West', 4, '450–468', '1790', 'D 10:00-20:00', '4 West|joint replacement floor|ortho inpatient', 'dept', 'B', 45],
];

const HVP: Row[] = [
  // Level 1
  ['Heart & Vascular Pavilion Welcome Desk', 1, 'Pavilion lobby', '2000', 'MF 06:30-18:00', 'pavilion reception|pavilion information|check in heart', 'service', 'hub', 15],
  ['Cardiology Clinic', 1, '110–128', '2110', 'MF 07:30-17:00', 'heart doctor|cardiologist|heart clinic|cardiac clinic', 'clinic', 'A', 40],
  ['Echocardiography Lab', 1, '130–138', '2130', 'MF 07:30-16:30', 'echo|heart ultrasound|echocardiogram', 'service', 'hub', 40],
  ['Electrocardiogram (EKG) Testing', 1, '140', '2140', 'MF 07:30-16:30', 'EKG|ECG|heart tracing|heart rhythm test', 'service', 'hub', 28],
  ['Cardiac Stress Testing Lab', 1, '150–158', '2150', 'MF 07:30-16:00', 'stress test|treadmill test|nuclear stress', 'service', 'B', 40],
  ['Vascular Lab', 1, '160–168', '2160', 'MF 07:30-16:00', 'vein ultrasound|vascular testing|leg circulation|blood flow test', 'service', 'B', 50],
  ['Pavilion Pharmacy', 1, '104', '2180', 'MF 08:00-17:30', 'pharmacy|prescriptions|heart medication', 'amenity:pharmacy', 'A', 22],
  ['Pavilion Café', 1, 'Pavilion lobby', '2020', 'MF 06:30-15:00', 'coffee|cafeteria|snacks|sandwiches|food|eat', 'amenity:cafe', 'hub', 24],
  ['Wheelchair Loan Station, Pavilion Entrance', 1, 'Pavilion lobby', '2001', 'MF 06:30-18:00', 'wheelchair|walker|mobility|wheel chair', 'amenity:wheelchair', 'hub', 18],
  ['Restrooms, Pavilion Level 1', 1, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 20],
  // Level 2
  ['Cardiac Rehabilitation', 2, '270–288', '2270', 'MF 07:00-16:30', 'cardiac rehab|heart rehab|cardiopulmonary rehabilitation|cardio rehab|heart exercise program', 'dept', 'B', 30],
  ['Pulmonary Rehabilitation', 2, '290–298', '2290', 'MF 07:30-16:00', 'lung rehab|breathing exercise|COPD program|pulmonary rehab', 'dept', 'B', 55],
  ['Cardiac Surgery Clinic', 2, '210–226', '2210', 'MF 08:00-16:30', 'heart surgery|bypass surgery|valve surgery|cardiothoracic', 'clinic', 'A', 40],
  ['Heart Failure Clinic', 2, '230–244', '2230', 'MF 08:00-16:30', 'CHF|heart failure|weak heart|fluid in lungs', 'clinic', 'hub', 35],
  ['Electrophysiology & Pacemaker Clinic', 2, '246–258', '2246', 'MF 08:00-16:30', 'EP|pacemaker|defibrillator|arrhythmia|heart rhythm', 'clinic', 'hub', 55],
  ['Anticoagulation Clinic', 2, '260', '2260', 'MF 07:30-16:00', 'coumadin clinic|blood thinner|INR check|warfarin', 'clinic', 'hub', 70],
  ['Cardiac Nutrition Counseling', 2, '268', '2268', 'MF 08:00-16:00', 'dietitian|heart healthy diet|nutritionist', 'service', 'B', 22],
  ['Vascular Surgery Clinic', 2, '200–208', '2200', 'MF 08:00-16:30', 'vein surgery|aneurysm|artery|varicose veins', 'clinic', 'A', 25],
  ['Pavilion Registration & Billing', 2, '202', '2204', 'MF 07:30-17:00', 'pavilion check in|heart billing', 'service', 'A', 30],
  ['Restrooms, Pavilion Level 2', 2, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 20],
  // Level 3
  ['Cardiac Catheterization Lab', 3, '300–318', '2300', 'MF 06:30-17:00', 'cath lab|heart cath|angiogram|stent', 'dept', 'hub', 40],
  ['Cath Lab Family Waiting Room', 3, '320', '2320', 'MF 06:00-18:00', 'cath waiting|heart procedure waiting', 'service', 'hub', 28],
  ['Interventional Radiology', 3, '330–338', '2330', 'MF 07:00-17:00', 'IR|vascular radiology|image guided procedures', 'dept', 'B', 40],
  ['Cardiac Pre-Procedure Unit', 3, '340–352', '2340', 'MF 06:00-17:00', 'pre-cath|heart procedure check in|recovery bay', 'dept', 'B', 55],
  ['Heart Transplant & VAD Clinic', 3, '360–372', '2360', 'MF 08:00-16:30', 'heart transplant|LVAD|mechanical heart pump|transplant clinic', 'clinic', 'A', 40],
  ['Cardiac Imaging: MRI & CT', 3, '380–392', '2380', 'MF 07:00-18:00', 'heart MRI|cardiac CT|calcium score|heart scan', 'service', 'hub', 55],
  ['Restrooms, Pavilion Level 3', 3, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 20],
  // Level 4
  ['Cardiac Care Unit (CCU)', 4, '400–430', '2400', '24', 'CCU|cardiac ICU|heart intensive care', 'dept', 'hub', 45],
  ['Cardiac Step-Down Unit 4 West', 4, '432–470', '2430', 'D 10:00-20:00', 'telemetry|4 West|heart inpatient|step down', 'dept', 'A', 40],
  ['Vascular Surgery Unit 4 East', 4, '472–498', '2470', 'D 10:00-20:00', '4 East|vascular inpatient', 'dept', 'B', 40],
  ['Cardiovascular Research Office', 4, '402', '2490', 'MF 08:00-17:00', 'heart studies|cardiology research', 'service', 'A', 50],
  ['Heart & Vascular Conference Center', 4, '410', '2495', 'MF 07:30-17:00', 'meeting rooms|conference|pavilion events', 'service', 'hub', 60],
  ['Lipid & Cholesterol Clinic', 1, '170', '2170', 'MF 08:00-16:30', 'cholesterol|statins|lipid doctor|triglycerides', 'clinic', 'B', 62],
  ['Blood Pressure & Hypertension Clinic', 1, '172', '2172', 'MF 08:00-16:30', 'high blood pressure|hypertension|BP check', 'clinic', 'B', 66],
  ['Holter Monitor & Event Recorder Hookup', 1, '142', '2142', 'MF 08:00-16:00', 'heart monitor|24 hour monitor|holter|wearable heart monitor', 'service', 'hub', 32],
  ['Pavilion Patient Education Library', 1, '106', '2106', 'MF 08:00-16:30', 'heart health books|handouts|patient education|learn about heart', 'service', 'A', 26],
  ['Pavilion Valet & Drop-Off Desk', 1, 'Pavilion lobby', '2002', 'MF 06:30-17:30', 'valet|car drop off|ride pickup|drop off', 'service', 'hub', 22],
  ['Cardiac Genetics & Family Screening', 2, '262', '2262', 'MF 08:30-16:00', 'inherited heart disease|genetic heart testing', 'clinic', 'hub', 72],
  ['Cardio-Oncology Clinic', 2, '264', '2264', 'MF 08:00-16:30', 'heart care during cancer treatment|chemo heart', 'clinic', 'hub', 74],
  ['Heart Health Support Group Room', 2, '266', '2266', 'MF 09:00-16:00', 'cardiac support group|heart patient group|peer support', 'service', 'B', 18],
  ['Dialysis Access & Vein Clinic', 3, '394', '2394', 'MF 07:30-16:30', 'fistula|dialysis access|vein mapping', 'clinic', 'B', 65],
  ['Wheelchair Loan Station, Pavilion Level 2', 2, 'Near elevators', '2205', 'MF 06:30-18:00', 'wheelchair|walker|mobility|wheel chair', 'amenity:wheelchair', 'hub', 16],
];

const WC: Row[] = [
  // Level 1
  ['Women’s & Children’s Welcome Desk', 1, 'Lobby', '3000', 'D 06:30-20:00', 'reception|info desk|front desk|check in', 'service', 'hub', 15],
  ['Pediatric Emergency Department', 1, '110–134', '3911', '24', 'children’s ER|kids emergency|pediatric ER|child emergency', 'dept', 'A', 40],
  ['Pediatric Primary Care', 1, '140–160', '3140', 'MF 08:00-17:30', 'kids doctor|pediatrician|child checkup|well child|vaccines', 'clinic', 'B', 35],
  ['Pediatric Specialty Clinics', 1, '162–190', '3162', 'MF 08:00-17:00', 'children’s specialists|kids specialty', 'clinic', 'B', 60],
  ['Childhood Immunization Clinic', 1, '192', '3192', 'MF 08:30-16:30', 'shots|vaccines|immunizations|vaccinations kids', 'clinic', 'B', 75],
  ['Breastfeeding Support Center', 1, '104', '3040', 'MF 08:00-16:00', 'lactation consultant|nursing help|breast pump', 'service', 'A', 22],
  ['Garden Court Coffee', 1, 'Lobby', '3022', 'D 06:30-16:00', 'coffee|cafeteria|tea|snacks|food|eat', 'amenity:cafe', 'hub', 22],
  ['Wheelchair Loan Station, Women’s & Children’s', 1, 'Lobby', '3001', 'D 06:30-20:00', 'wheelchair|stroller|mobility|wheel chair', 'amenity:wheelchair', 'hub', 18],
  ['Restrooms and Family Restrooms, Level 1', 1, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|family restroom|baby changing', 'amenity:restroom', 'hub', 20],
  // Level 2
  ['Labor & Delivery', 2, '200–240', '3200', '24', 'L&D|having a baby|labor|delivery|maternity|birth', 'dept', 'A', 45],
  ['Obstetric Triage', 2, '242–248', '3242', '24', 'OB triage|pregnancy emergency|contractions|water broke', 'dept', 'A', 20],
  ['Mother-Baby Unit 2 East', 2, '250–290', '3250', 'D 10:00-20:00', 'postpartum|new moms|maternity ward|2 East', 'dept', 'B', 40],
  ['Obstetrics & Gynecology Clinic', 2, '292–298', '3292', 'MF 08:00-17:00', 'OB GYN|prenatal|pregnancy checkup|women’s health|gynecologist', 'clinic', 'B', 55],
  ['Maternal-Fetal Medicine', 2, '260–268', '3260', 'MF 08:00-16:30', 'high risk pregnancy|MFM|perinatology', 'clinic', 'hub', 28],
  ['Fetal Ultrasound & Imaging', 2, '270–278', '3270', 'MF 07:30-16:30', 'pregnancy ultrasound|sonogram|baby ultrasound', 'service', 'hub', 40],
  ['Childbirth & Parenting Classes', 2, '280', '3280', 'MS 09:00-20:00', 'birth classes|lamaze|parenting|baby care class', 'service', 'B', 22],
  ['Meditation & Quiet Room, Level 2', 2, '205', '3205', '24', 'chapel|prayer|quiet space|meditation', 'amenity:chapel', 'A', 65],
  ['Restrooms, Women’s & Children’s Level 2', 2, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 20],
  // Level 3
  ['Neonatal Intensive Care Unit (NICU)', 3, '300–350', '3300', '24', 'NICU|newborn ICU|premature babies|preemies', 'dept', 'hub', 45],
  ['Pediatric Intensive Care Unit (PICU)', 3, '352–376', '3352', '24', 'PICU|child ICU|children’s critical care', 'dept', 'B', 40],
  ['Pediatric Inpatient Unit 3 West', 3, '301–339', '3380', 'D 09:00-21:00', 'kids floor|children’s hospital rooms|3 West', 'dept', 'A', 50],
  ['Pediatric Surgery Clinic', 3, '378–386', '3378', 'MF 08:00-16:30', 'children’s surgery|kids surgery', 'clinic', 'B', 60],
  ['Child Life Playroom', 3, '390', '3390', 'D 09:00-19:00', 'play room|kids activities|toys|child life', 'service', 'B', 70],
  ['Pediatric Oncology & Hematology', 3, '392–398', '3392', 'MF 08:00-17:00', 'kids cancer|childhood leukemia|children’s blood disorders', 'clinic', 'B', 75],
  ['Family Resource Room', 3, '312', '3312', 'D 08:00-20:00', 'family resources|parents lounge|parent room|overnight stay help', 'service', 'A', 38],
  ['Restrooms, Women’s & Children’s Level 3', 3, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 20],
  ['Pediatric Rehabilitation & Therapy', 3, '316–324', '3316', 'MF 08:00-17:00', 'child physical therapy|kids PT|speech therapy children', 'dept', 'A', 55],
  ['Lactation Room, Level 1', 1, '106', '3042', '24', 'nursing room|mother’s room|pumping room|breastfeeding room', 'amenity:other', 'A', 26],
  ['Pediatric Radiology', 1, '194–198', '3194', 'MF 07:30-17:00', 'children’s x-ray|kids imaging|child scans', 'service', 'B', 80],
  ['Newborn Hearing & Screening Clinic', 2, '294', '3294', 'MF 08:30-15:30', 'baby hearing test|newborn screening', 'clinic', 'B', 60],
  ['Gynecologic Oncology Clinic', 2, '299', '3299', 'MF 08:00-16:30', 'women’s cancer|ovarian|cervical cancer', 'clinic', 'B', 70],
  ['Pediatric Cardiology Clinic', 1, '164–166', '3164', 'MF 08:00-16:30', 'kids heart doctor|children’s heart|heart murmur child', 'clinic', 'B', 62],
  ['Pediatric Neurology Clinic', 1, '168', '3168', 'MF 08:00-16:30', 'kids seizures|child headaches|children’s neurologist', 'clinic', 'B', 66],
  ['Adolescent & Teen Health Clinic', 1, '170', '3170', 'MF 08:30-17:30', 'teen doctor|teenager clinic|adolescent medicine', 'clinic', 'B', 68],
  ['Pediatric Dental Clinic', 1, '174–178', '3174', 'MF 08:00-16:30', 'children’s dentist|kids teeth|baby teeth', 'clinic', 'B', 70],
  ['Pediatric Pulmonology & Asthma Clinic', 1, '180–184', '3180', 'MF 08:00-16:30', 'kids asthma|child breathing|children’s lung doctor', 'clinic', 'B', 72],
  ['Pediatric Pharmacy', 1, '108', '3044', 'MF 08:00-18:00', 'pharmacy|kids medicine|children’s prescriptions|medicine', 'amenity:pharmacy', 'A', 30],
  ['Cesarean Operating Rooms Family Waiting', 2, '206', '3206', '24', 'C-section waiting|surgical birth waiting|OB operating room', 'service', 'A', 50],
  ['Pediatric Behavioral Health Clinic', 3, '396', '3396', 'MF 08:00-17:30', 'child psychologist|kids counseling|children’s mental health|ADHD', 'clinic', 'B', 78],
];

const OC: Row[] = [
  // Level 1
  ['Outpatient Center Check-In', 1, 'Lobby', '4000', 'MF 06:30-18:00', 'registration|check in|front desk|reception|information', 'service', 'hub', 18],
  ['Outpatient Pharmacy', 1, '110', '4100', 'MF 08:00-19:00', 'pharmacy|prescriptions|medication pickup|drug store', 'amenity:pharmacy', 'A', 30],
  ['Outpatient Laboratory', 1, '120–128', '4120', 'MS 06:30-17:00', 'lab|blood draw|blood work|urine test|phlebotomy', 'service', 'A', 45],
  ['Primary Care & Internal Medicine', 1, '130–168', '4130', 'MF 07:30-17:30', 'family doctor|PCP|regular doctor|internal medicine|checkup|physical', 'clinic', 'hub', 45],
  ['Senior Health & Geriatrics Clinic', 1, '170–182', '4170', 'MF 08:00-16:30', 'older adults|elder care|memory care|geriatrician', 'clinic', 'B', 40],
  ['Diabetes & Endocrinology Clinic', 1, '184–196', '4184', 'MF 08:00-16:30', 'diabetes|sugar|thyroid|insulin|endocrine', 'clinic', 'B', 60],
  ['Mammography & Breast Imaging', 1, '140–148', '4140', 'MF 07:30-17:00', 'mammogram|breast screening|breast ultrasound', 'service', 'hub', 55],
  ['Bone Density & DEXA Scan', 1, '150', '4150', 'MF 08:00-16:00', 'DEXA|osteoporosis|bone scan|bone test', 'service', 'hub', 62],
  ['Outpatient Imaging: MRI & Ultrasound', 1, '152–158', '4152', 'MF 07:00-20:00', 'MRI|ultrasound|radiology|scan|imaging', 'service', 'B', 35],
  ['Wheelchair Loan Station, Outpatient Center', 1, 'Lobby', '4001', 'MF 06:30-18:00', 'wheelchair|walker|mobility|wheel chair', 'amenity:wheelchair', 'hub', 20],
  ['Outpatient Center Coffee Cart', 1, 'Lobby', '4021', 'MF 07:00-13:00', 'coffee|snacks|tea|food|eat|cafeteria', 'amenity:cafe', 'hub', 25],
  ['Restrooms, Outpatient Center Level 1', 1, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 20],
  // Level 2
  ['Orthopedics & Sports Medicine', 2, '200–238', '4200', 'MF 07:30-17:00', 'bones|joints|knee|hip|shoulder|broken bone|fracture clinic', 'clinic', 'A', 45],
  ['Physical Therapy & Rehabilitation', 2, '240–268', '4240', 'MF 07:00-18:00', 'PT|physio|physiotherapy|therapy|rehab|exercise therapy', 'dept', 'hub', 50],
  ['Occupational Therapy & Hand Clinic', 2, '270–280', '4270', 'MF 07:30-17:00', 'OT|hand therapy|hand doctor|arthritis hands', 'clinic', 'B', 35],
  ['Dermatology Clinic', 2, '282–296', '4282', 'MF 08:00-17:00', 'skin doctor|rash|skin check|mole check|dermatologist', 'clinic', 'B', 55],
  ['Allergy & Immunology Clinic', 2, '202–210', '4202', 'MF 08:00-16:30', 'allergies|allergy shots|asthma|hay fever', 'clinic', 'A', 28],
  ['Pulmonology & Sleep Medicine', 2, '212–226', '4212', 'MF 08:00-16:30', 'lung doctor|sleep study|sleep apnea|breathing tests|PFT', 'clinic', 'A', 55],
  ['Rheumatology Clinic', 2, '228–236', '4228', 'MF 08:00-16:30', 'arthritis|lupus|autoimmune|joint pain', 'clinic', 'hub', 28],
  ['Wound Care & Hyperbaric Center', 2, '298', '4298', 'MF 07:30-16:30', 'wound clinic|diabetic foot|hyperbaric|bed sores', 'dept', 'B', 70],
  ['Podiatry Clinic', 2, '262–266', '4262', 'MF 08:00-16:30', 'foot doctor|feet|toenails|bunions|foot care', 'clinic', 'hub', 70],
  ['Restrooms, Outpatient Center Level 2', 2, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 20],
  // Level 3
  ['Eye Institute & Ophthalmology', 3, '300–338', '4300', 'MF 07:30-17:00', 'eye doctor|vision|cataract|glaucoma|eye exam|ophthalmologist', 'clinic', 'A', 45],
  ['Optical Shop & Eyeglasses', 3, '340', '4340', 'MF 09:00-17:00', 'glasses|eyeglasses|contacts|frames', 'service', 'hub', 28],
  ['Audiology & Hearing Center', 3, '342–352', '4342', 'MF 08:00-16:30', 'hearing test|hearing aids|ears|audiologist', 'clinic', 'hub', 40],
  ['Dental & Oral Surgery Clinic', 3, '354–376', '4354', 'MF 08:00-17:00', 'dentist|teeth|tooth pain|dental|extraction', 'clinic', 'B', 40],
  ['Behavioral Health & Psychiatry', 3, '378–398', '4378', 'MF 08:00-18:00', 'mental health|counseling|therapist|depression|anxiety|psychiatrist', 'clinic', 'B', 60],
  ['Nephrology & Dialysis Clinic', 3, '302–316', '4310', 'MF 06:00-18:00', 'kidney doctor|dialysis|kidney disease|renal', 'clinic', 'A', 30],
  ['Endocrine Surgery & Thyroid Clinic', 3, '318–326', '4318', 'MF 08:00-16:30', 'thyroid surgery|parathyroid', 'clinic', 'A', 62],
  ['Radiation Oncology', 3, '328–336', '4328', 'MF 07:30-17:00', 'radiation therapy|cancer radiation|linear accelerator', 'dept', 'hub', 20],
  ['Cancer Support & Survivorship Center', 3, '360', '4360', 'MF 09:00-16:30', 'cancer support group|survivor program|wigs|caregiver help', 'service', 'hub', 60],
  ['Restrooms, Outpatient Center Level 3', 3, 'Near elevators', '', '24', 'toilet|bathroom|restroom|washroom|accessible restroom', 'amenity:restroom', 'hub', 20],
  ['Outpatient Surgery Pickup Lounge', 1, '198', '4198', 'MF 07:00-18:00', 'family pickup|surgery discharge pickup|ride home', 'service', 'B', 70],
  ['Smoking Cessation & Lung Health Program', 2, '214', '4214', 'MF 08:30-16:00', 'quit smoking|tobacco|vape help', 'service', 'A', 62],
  ['Travel & Immunization Clinic', 1, '172', '4172', 'MF 08:30-16:30', 'travel vaccines|passport shots|yellow fever|international travel', 'clinic', 'B', 45],
  ['Weight Management & Bariatric Clinic', 3, '362–368', '4362', 'MF 08:00-16:30', 'weight loss|bariatric|obesity|gastric', 'clinic', 'hub', 68],
  ['Hearing & Balance Therapy', 3, '344', '4344', 'MF 08:00-16:00', 'dizziness|vertigo|balance problems', 'service', 'hub', 45],
  ['Sleep Disorders Lab', 3, '306', '4306', 'D 19:00-07:00', 'overnight sleep study|sleep lab', 'service', 'A', 52],
  ['Express Care (Walk-In Clinic)', 1, '100–106', '4010', 'D 08:00-20:00', 'walk in|urgent care|minor injuries|sore throat|same day visit|no appointment', 'clinic', 'A', 25],
  ['Women’s Health & Menopause Clinic', 1, '186–190', '4186', 'MF 08:00-16:30', 'menopause|hormone therapy|women’s clinic|gynecology', 'clinic', 'B', 64],
  ['Nutrition & Dietitian Services', 1, '174', '4174', 'MF 08:00-16:30', 'dietitian|diet help|nutritionist|healthy eating|meal plan', 'service', 'B', 52],
  ['Patient Education & Health Library', 1, '116', '4116', 'MF 08:00-17:00', 'handouts|health books|learn about condition|resource center', 'service', 'A', 38],
  ['Outpatient Billing Window', 1, '114', '4114', 'MF 08:30-16:30', 'pay bill|copay|payments|billing questions', 'service', 'A', 35],
  ['Transportation & Medical Escort Desk', 1, 'Lobby', '4012', 'MF 07:00-17:00', 'ride home|medical transport|taxi voucher|paratransit|escort', 'service', 'hub', 28],
  ['Hepatology & Liver Clinic', 2, '218–222', '4218', 'MF 08:00-16:30', 'liver doctor|hepatitis|fatty liver|cirrhosis', 'clinic', 'A', 62],
  ['Infectious Disease Clinic', 2, '230', '4230', 'MF 08:00-16:30', 'HIV care|infection doctor|antibiotic infusion|hepatitis C', 'clinic', 'hub', 30],
  ['Lung Cancer Screening Program', 2, '216', '4216', 'MF 08:00-16:00', 'low dose CT|lung scan smokers|lung screening', 'service', 'A', 58],
  ['Integrative Medicine & Acupuncture', 2, '284', '4284', 'MF 09:00-17:00', 'acupuncture|massage therapy|wellness|alternative medicine|holistic', 'clinic', 'B', 52],
];

const GAR: Row[] = [
  ['Parking Garage P1, Level 1: Visitor & Valet', 1, 'Level 1', '5001', 'D 05:00-23:00', 'parking|visitor parking|valet|car|park', 'parking', 'hub', 10],
  ['Parking Garage P1, Level 2: Skybridge to Outpatient Center', 2, 'Level 2', '5002', '24', 'parking|park|skybridge parking|car', 'parking', 'hub', 10],
  ['Parking Garage P1, Level 3: Accessible Parking', 3, 'Level 3', '5003', '24', 'handicap parking|disabled parking|accessible spaces|parking|car', 'parking', 'hub', 10],
  ['Parking Garage P1, Level 4', 4, 'Level 4', '5004', '24', 'parking|park|car', 'parking', 'hub', 10],
  ['Parking Garage P1, Level 5 (Rooftop)', 5, 'Level 5', '5005', '24', 'parking|rooftop|park|car', 'parking', 'hub', 10],
  ['Parking Pay Station, Level 1', 1, 'Next to elevator', '5010', '24', 'pay for parking|parking ticket|parking fee|pay parking|validation', 'parking', 'A', 12],
  ['Parking Pay Station, Level 3', 3, 'Next to elevator', '5011', '24', 'pay for parking|parking ticket|parking fee|pay parking', 'parking', 'A', 12],
  ['Patient Valet Check-In', 1, 'Entrance lane', '5020', 'MF 06:00-18:00', 'valet|drop off car|valet service', 'parking', 'hub', 30],
  ['Electric Vehicle Charging, Level 4', 4, 'East side', '5030', '24', 'EV charging|charge car|tesla|electric car', 'parking', 'hub', 28],
  ['Shuttle & Rideshare Pickup', 1, 'Level 1 curb', '5040', '24', 'taxi|uber|lyft|ride|shuttle bus|cab|pickup', 'parking', 'hub', 35],
  ['Restrooms, Parking Garage P1 Level 1', 1, 'Next to elevator', '', '24', 'toilet|bathroom|restroom|washroom', 'amenity:restroom', 'A', 15],
  ['Parking Validation Desk', 1, 'Level 1 booth', '5012', 'MF 07:00-17:00', 'validate parking|parking discount|free parking|reduced parking', 'parking', 'hub', 20],
  ['Parking Pay Station, Level 2', 2, 'Next to elevator', '5013', '24', 'pay for parking|parking ticket|parking fee|pay parking', 'parking', 'A', 12],
  ['Wheelchair Loan Station, Parking Garage P1', 1, 'Next to elevator', '5014', 'D 06:00-21:00', 'wheelchair|walker|mobility|wheel chair', 'amenity:wheelchair', 'A', 14],
];

const BUILD: [BuildingId, Row[]][] = [
  ['MB', MB],
  ['HVP', HVP],
  ['WC', WC],
  ['OC', OC],
  ['GAR', GAR],
];

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const DESTINATIONS: Destination[] = BUILD.flatMap(([b, rows]) =>
  rows.map(([name, level, rooms, ext, hours, aliases, cat = 'service', side, d]) => {
    let kind: AmenityKind | undefined;
    let c: Cat;
    if (cat.startsWith('amenity:')) {
      c = 'amenity';
      kind = cat.split(':')[1] as AmenityKind;
    } else c = cat as Cat;
    return {
      id: `${b.toLowerCase()}-${slug(name)}`,
      name,
      b,
      level,
      rooms,
      ext,
      hours,
      aliases: aliases.split('|'),
      cat: c,
      kind,
      side: side ?? 'hub',
      d: d ?? 30,
    } satisfies Destination;
  }),
);

export const DEST_BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]));
export const CARDIAC_REHAB_ID = 'hvp-cardiac-rehabilitation';
