"""Seed HealthStack with months of realistic use, through the app's own Django models.

Starts from the repo's bundled demo DB (copied by start.sh / reset), cleans up its
placeholder text and extends it. Deterministic (fixed RNG seed); dates are relative
to today so dashboards ("today's appointments") always look current.

Run:  PYTHONPATH=.ui-capture:. DJANGO_SETTINGS_MODULE=ui_settings python .ui-capture/seed.py
"""
import datetime as dt
import os
import random
import string
import sys

import django

django.setup()

from django.contrib.auth.hashers import make_password  # noqa: E402
from django.db import transaction  # noqa: E402
from django.utils import timezone  # noqa: E402

from hospital.models import User, Hospital_Information, Patient  # noqa: E402
from hospital_admin.models import (Admin_Information, Clinical_Laboratory_Technician,  # noqa: E402
                                   hospital_department, specialization, service, Test_Information)
from doctor.models import (Doctor_Information, Appointment, Education, Experience, Report,  # noqa: E402
                           Specimen, Test, Prescription, Prescription_medicine, Prescription_test,
                           testCart, testOrder, Doctor_review)
from pharmacy.models import Pharmacist, Medicine, Cart, Order  # noqa: E402
from sslcommerz.models import Payment  # noqa: E402
from ChatApp.models import chatMessages  # noqa: E402

R = random.Random(20260517)
TODAY = dt.date.today()
PASSWORD = os.environ.get('SEED_PASSWORD', 'Healthstack@2026')
PW_HASH = make_password(PASSWORD)
PRIMARY = 'fayaz'  # the established patient account used for the capture


def d(offset_days):
    return TODAY + dt.timedelta(days=offset_days)


def rid(n=8, prefix=''):
    return prefix + ''.join(R.choices(string.ascii_uppercase + string.digits, k=n))


def slot():
    h = R.choice([9, 10, 11, 12, 15, 16, 17, 18, 19, 20])
    m = R.choice([0, 10, 15, 20, 30, 40, 45, 50])
    ampm = 'am' if h < 12 else 'pm'
    h12 = h if h <= 12 else h - 12
    return '%d:%02d %s' % (h12, m, ampm)


def mkuser(username, email, first, last, joined, **flags):
    u, _ = User.objects.get_or_create(username=username, defaults={'email': email})
    u.email = email
    u.first_name, u.last_name = first, last
    u.password = PW_HASH
    u.is_active = True
    u.date_joined = timezone.make_aware(dt.datetime.combine(joined, dt.time(R.randint(8, 21), R.randint(0, 59))))
    for k, v in flags.items():
        setattr(u, k, v)
    u.save()
    return u


# ---------------------------------------------------------------- hospitals
HOSPITALS = {
    1: dict(name='Square Hospitals Ltd.', address='18/F, Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath, Dhaka 1205',
            description='A 400-bed tertiary care hospital in Panthapath offering round-the-clock emergency, a dedicated cancer centre, cardiac catheterisation labs and one of the largest ICU set-ups in Dhaka. JCI-standard nursing, in-house pharmacy and a fully automated laboratory.',
            email='info@squarehospital.com', phone_number=10616, hospital_type='private',
            general_bed_no=212, available_icu_no=9, regular_cabin_no=64, emergency_cabin_no=18, vip_cabin_no=12),
    2: dict(name='Labaid Specialized Hospital', address='House 06, Road 04, Dhanmondi, Dhaka 1205',
            description='Labaid Specialized Hospital in Dhanmondi focuses on cardiac, neuro and critical care. The diagnostic wing runs 24 hours, and the anaesthesiology team supports more than 30 surgeries a day.',
            email='info@labaidgroup.com', phone_number=10606, hospital_type='private',
            general_bed_no=150, available_icu_no=4, regular_cabin_no=48, emergency_cabin_no=10, vip_cabin_no=6),
    3: dict(name='United Hospital Limited', address='Plot 15, Road 71, Gulshan 2, Dhaka 1212',
            description='United Hospital is a 500-bed multidisciplinary hospital in Gulshan with a heart centre, ENT and dental surgery, and a 24/7 emergency unit with ambulance service across Dhaka city.',
            email='info@uhlbd.com', phone_number=10666, hospital_type='private',
            general_bed_no=260, available_icu_no=12, regular_cabin_no=80, emergency_cabin_no=20, vip_cabin_no=15),
    4: dict(name='Anwer Khan Modern Medical College Hospital', address='House 17, Road 08, Dhanmondi (Kalabagan), Dhaka 1205',
            description='Teaching hospital attached to Anwer Khan Modern Medical College. Strong departments in cardiology, oncology and neurology, with affordable cabins and a busy outpatient department.',
            email='info@akmmch.com', phone_number=9661213, hospital_type='private',
            general_bed_no=320, available_icu_no=6, regular_cabin_no=70, emergency_cabin_no=14, vip_cabin_no=4),
    5: dict(name='Ibrahim Cardiac Hospital & Research Institute', address='122 Kazi Nazrul Islam Avenue, Shahbag, Dhaka 1000',
            description='Run by the Diabetic Association of Bangladesh, Ibrahim Cardiac is a dedicated heart hospital: interventional cardiology, CCU, open-heart surgery and cardiac rehabilitation.',
            email='info@ibrahimcardiac.org.bd', phone_number=55165088, hospital_type='public',
            general_bed_no=120, available_icu_no=3, regular_cabin_no=30, emergency_cabin_no=8, vip_cabin_no=2),
}
NEW_HOSPITALS = [
    dict(name='Evercare Hospital Dhaka', address='Plot 81, Block E, Bashundhara R/A, Dhaka 1229',
         featured_image='hospitals/Screenshot_2022-09-15_at_1.09.40_PM.png',
         description='Evercare (formerly Apollo Hospitals Dhaka) is a 425-bed JCI-accredited hospital in Bashundhara with orthopaedics, urology, neurosciences and a dedicated paediatric unit.',
         email='info@evercarebd.com', phone_number=10678, hospital_type='private',
         general_bed_no=240, available_icu_no=7, regular_cabin_no=60, emergency_cabin_no=16, vip_cabin_no=10),
    dict(name='Dhaka Medical College Hospital', address='Secretariat Road, Bakshibazar, Dhaka 1000',
         description='The largest public hospital in Bangladesh. Free and low-cost treatment across almost every speciality, with a burn unit, high-volume emergency and teaching wards.',
         email='dmch@hospi.dghs.gov.bd', phone_number=55165001, hospital_type='public',
         general_bed_no=2600, available_icu_no=2, regular_cabin_no=40, emergency_cabin_no=30, vip_cabin_no=0),
    dict(name='Chittagong Medical College Hospital', address='57 K.B. Fazlul Kader Road, Panchlaish, Chattogram 4203',
         description='Main public referral hospital for the Chattogram division, known for its neurology, paediatrics and orthopaedic departments.',
         email='cmch@hospi.dghs.gov.bd', phone_number=31630335, hospital_type='public',
         general_bed_no=1300, available_icu_no=1, regular_cabin_no=26, emergency_cabin_no=12, vip_cabin_no=0),
]

DEPT_IMG = {
    'Cardiology': 'departments/cardiologist.png', 'Neurology': 'departments/neurology.png',
    'Orthopedics': 'departments/orthopedic.png', 'Urology': 'departments/urology.png',
    'Dentistry': 'departments/dentist.png', 'Pediatrics': 'departments/specialities-01.png',
    'Dermatology': 'departments/specialities-05.png', 'Cancer': 'departments/can.jpg',
    'Ear Nose and Throat (ENT)': 'departments/ent.jpg', 'Anesthesiology': 'departments/ann.jpg',
    'Gastroenterology': 'departments/specialities-03.png', 'Medicine': 'departments/specialities-04.png',
}
EXTRA_DEPTS = {
    1: ['Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology'],
    2: ['Cardiology', 'Neurology', 'Gastroenterology'],
    3: ['Neurology', 'Urology', 'Pediatrics'],
    4: ['Medicine', 'Orthopedics'],
    5: ['Medicine'],
    'Evercare Hospital Dhaka': ['Cardiology', 'Orthopedics', 'Urology', 'Neurology', 'Pediatrics'],
    'Dhaka Medical College Hospital': ['Medicine', 'Cardiology', 'Dermatology', 'Pediatrics'],
    'Chittagong Medical College Hospital': ['Neurology', 'Pediatrics', 'Orthopedics'],
}
SPECS = {
    'Evercare Hospital Dhaka': ['Interventional Cardiology', 'Joint Replacement', 'Paediatric Neurology'],
    'Dhaka Medical College Hospital': ['Internal Medicine', 'Burn & Plastic Surgery', 'Dermatology'],
    'Chittagong Medical College Hospital': ['Neurosurgery', 'Neonatology'],
    1: ['Orthopaedic Surgery', 'Child Health'], 3: ['Urology', 'Paediatric Surgery'], 2: ['Gastroenterology'],
}
SERVICES = {
    'Evercare Hospital Dhaka': ['Ambulance', 'Emergency unit', '24/7 pharmacy', 'Air ambulance', 'Blood bank'],
    'Dhaka Medical College Hospital': ['Emergency unit', 'Burn unit', 'Blood bank', 'Ambulance'],
    'Chittagong Medical College Hospital': ['Emergency unit', 'Ambulance', 'Dialysis'],
    1: ['24/7 pharmacy', 'Blood bank', 'Home sample collection'], 2: ['Emergency unit', 'Dialysis'],
    3: ['Blood bank', 'Health check-up packages'], 4: ['Ambulance', '24/7 pharmacy'], 5: ['Ambulance', 'Cardiac rehabilitation'],
}


def seed_hospitals():
    for hid, vals in HOSPITALS.items():
        Hospital_Information.objects.filter(hospital_id=hid).update(**vals)
    for vals in NEW_HOSPITALS:
        Hospital_Information.objects.update_or_create(name=vals['name'], defaults=vals)
    # tidy messy names left in the bundled DB
    service.objects.filter(service_name__in=['emergency ', 'Emergency unit']).update(service_name='Emergency unit')
    service.objects.filter(service_name='24/7 pharamacy').update(service_name='24/7 pharmacy')
    specialization.objects.filter(specialization_name='heart specialist ').update(specialization_name='Heart Specialist')
    specialization.objects.filter(specialization_name='Neurosurgeon ').update(specialization_name='Neurosurgeon')
    specialization.objects.filter(specialization_name='Cardiothoraic Surgery').update(specialization_name='Cardiothoracic Surgery')

    def key_to_h(k):
        return Hospital_Information.objects.get(hospital_id=k) if isinstance(k, int) else Hospital_Information.objects.get(name=k)

    for k, names in EXTRA_DEPTS.items():
        h = key_to_h(k)
        for n in names:
            hospital_department.objects.get_or_create(hospital=h, hospital_department_name=n,
                                                      defaults={'featured_image': DEPT_IMG.get(n, 'departments/default.png')})
    for k, names in SPECS.items():
        h = key_to_h(k)
        for n in names:
            specialization.objects.get_or_create(hospital=h, specialization_name=n)
    for k, names in SERVICES.items():
        h = key_to_h(k)
        for n in names:
            service.objects.get_or_create(hospital=h, service_name=n)


# ---------------------------------------------------------------- staff
DOCTOR_FIXES = {  # existing doctor_id -> updates
    2: dict(gender='Male', department='Cardiologists', description='Interventional cardiologist with 9 years of experience in coronary angiography, primary PCI and heart-failure clinics. Sees adult patients with chest pain, hypertension and arrhythmia.', phone_number='01715199382', visiting_hour='12 pm - 8 pm', consultation_fee=1500, report_fee=700, institute='Dhaka Medical College', degree='MBBS, MD (Cardiology)', completion_year='2014', work_place='Square Hospitals Ltd.', designation='Associate Consultant', start_year='2018', end_year='Present', dob='1988-03-14'),
    4: dict(gender='Female', department='Physiatrists', description='Clinical oncologist managing breast, cervical and head-and-neck cancers. Coordinates chemotherapy day-care and long-term follow-up for survivors.', phone_number='01819443210', visiting_hour='12 pm - 6 pm', consultation_fee=1200, report_fee=600, institute='Sir Salimullah Medical College', degree='MBBS, FCPS (Oncology)', completion_year='2015', work_place='Square Hospitals Ltd.', designation='Consultant, Oncology', start_year='2019', end_year='Present', dob='1989-07-02'),
    5: dict(gender='Female', department='Pediatricians', description='Paediatrician with a special interest in childhood asthma, neonatal jaundice and growth monitoring.', phone_number='01911223344', visiting_hour='3 pm - 9 pm', consultation_fee=1100, report_fee=500, register_status='Accepted', hospital_name_id=1, institute='Mymensingh Medical College', degree='MBBS, DCH', completion_year='2016', work_place='Square Hospitals Ltd.', designation='Specialist, Paediatrics', start_year='2020', end_year='Present', dob='1990-11-21'),
    6: dict(gender='Male', department='Neurologists', description='Neurologist treating migraine, epilepsy, stroke rehabilitation and peripheral neuropathy. Runs the Thursday headache clinic.', phone_number='01556677889', visiting_hour='9 am - 3 pm', consultation_fee=1200, report_fee=600, register_status='Accepted', hospital_name_id=4, institute='Rajshahi Medical College', degree='MBBS, MD (Neurology)', completion_year='2013', work_place='Anwer Khan Modern Medical College Hospital', designation='Assistant Professor', start_year='2017', end_year='Present', dob='1986-01-09'),
    7: dict(gender='Female', department='Physiatrists', description='ENT surgeon: chronic sinusitis, tonsillectomy, hearing loss evaluation and endoscopic sinus surgery.', phone_number='01712345098', visiting_hour='6 pm - 9 pm', consultation_fee=1000, report_fee=500, institute='Chittagong Medical College', degree='MBBS, MS (ENT)', completion_year='2012', work_place='United Hospital Limited', designation='Consultant, ENT', start_year='2016', end_year='Present', dob='1985-05-30'),
    8: dict(gender='Female', department='Cardiologists', description='Cardiothoracic surgeon performing CABG and valve replacement. Senior member of the United Heart Centre surgical team.', phone_number='01733004411', visiting_hour='5 pm - 8 pm', consultation_fee=2000, report_fee=1000, institute='BSMMU', degree='MBBS, MS (CTS)', completion_year='2010', work_place='United Hospital Limited', designation='Senior Consultant', start_year='2014', end_year='Present', dob='1982-08-17'),
    9: dict(gender='Male', department='Neurologists', description='Neurosurgeon focusing on spine surgery and brain tumours. Newly applied to join a second hospital.', phone_number='01677889900', visiting_hour='2 pm - 7 pm', consultation_fee=1800, report_fee=800, register_status='Pending', hospital_name_id=4, institute='BSMMU', degree='MBBS, MS (Neurosurgery)', completion_year='2011', work_place='National Institute of Neurosciences', designation='Associate Professor', start_year='2015', end_year='Present', dob='1983-12-03'),
}
NEW_DOCTORS = [
    # username, name, gender, dept choice, hospital key, dept name, spec name, fee, report fee, hour, image, status
    ('rafiq.ahmed', 'Rafiqul Ahmed', 'Male', 'Cardiologists', 'Evercare Hospital Dhaka', 'Cardiology', 'Interventional Cardiology', 1800, 800, '10 am - 2 pm', 'doctors/rafi.jpg', 'Accepted'),
    ('nusrat.jahan', 'Nusrat Jahan', 'Female', 'Pediatricians', 'Evercare Hospital Dhaka', 'Pediatrics', 'Paediatric Neurology', 1500, 600, '4 pm - 8 pm', 'doctors/doctor-01.jpg', 'Accepted'),
    ('tanvir.hossain', 'Tanvir Hossain', 'Male', 'Physiatrists', 'Evercare Hospital Dhaka', 'Orthopedics', 'Joint Replacement', 2000, 900, '9 am - 1 pm', 'doctors/603465_488733571153747_332968119_n.jpg', 'Accepted'),
    ('shirin.akter', 'Shirin Akter', 'Female', 'Dermatologists', 'Dhaka Medical College Hospital', 'Dermatology', 'Dermatology', 800, 400, '8 am - 12 pm', 'doctors/user-default.png', 'Accepted'),
    ('mahbub.alam', 'Mahbubul Alam', 'Male', 'Cardiologists', 'Dhaka Medical College Hospital', 'Cardiology', 'Internal Medicine', 700, 350, '2 pm - 5 pm', 'doctors/83207224_1030195257351244_6702749846450733056_n.jpg', 'Accepted'),
    ('farhana.rahman', 'Farhana Rahman', 'Female', 'Neurologists', 2, 'Neurology', 'Allergy', 1400, 700, '5 pm - 9 pm', 'doctors/user-default.png', 'Accepted'),
    ('arif.chowdhury', 'Arif Chowdhury', 'Male', 'Physiatrists', 2, 'Gastroenterology', 'Gastroenterology', 1300, 600, '11 am - 3 pm', 'doctors/user-default.png', 'Accepted'),
    ('sabrina.islam', 'Sabrina Islam', 'Female', 'Dermatologists', 1, 'Dermatology', 'Orthopaedic Surgery', 1200, 500, '6 pm - 9 pm', 'doctors/user-default.png', 'Accepted'),
    ('kamrul.hasan', 'Kamrul Hasan', 'Male', 'Neurologists', 'Chittagong Medical College Hospital', 'Neurology', 'Neurosurgery', 900, 400, '9 am - 1 pm', 'doctors/user-default.png', 'Accepted'),
    ('tahmina.sultana', 'Tahmina Sultana', 'Female', 'Pediatricians', 3, 'Pediatrics', 'Paediatric Surgery', 1600, 700, '3 pm - 7 pm', 'doctors/user-default.png', 'Accepted'),
    ('imran.kabir', 'Imran Kabir', 'Male', 'Physiatrists', 3, 'Urology', 'Urology', 1700, 800, '10 am - 1 pm', 'doctors/user-default.png', 'Pending'),
    ('nadia.haque', 'Nadia Haque', 'Female', 'Cardiologists', 5, 'Cardiology', 'Heart Specialist', 1500, 700, '4 pm - 8 pm', 'doctors/user-default.png', 'Accepted'),
    ('sohel.rana', 'Sohel Rana', 'Male', 'Pediatricians', 'Chittagong Medical College Hospital', 'Pediatrics', 'Neonatology', 600, 300, '8 am - 11 am', 'doctors/user-default.png', 'Rejected'),
]
DOC_BLURB = {
    'Cardiologists': 'Treats hypertension, ischaemic heart disease and heart failure; performs echocardiography and stress testing.',
    'Neurologists': 'Manages headache, epilepsy, stroke follow-up and neuropathy; reviews MRI/EEG findings with patients in detail.',
    'Pediatricians': 'Child health from newborn checks to adolescence: vaccination schedules, asthma, fever and nutrition counselling.',
    'Physiatrists': 'Outpatient and surgical care with emphasis on recovery planning and physiotherapy coordination.',
    'Dermatologists': 'Acne, eczema, psoriasis, fungal infections and hair-loss clinics; minor dermatological procedures.',
}
SCHOOLS = ['Dhaka Medical College', 'Sir Salimullah Medical College', 'Chittagong Medical College', 'Rajshahi Medical College',
           'Sylhet MAG Osmani Medical College', 'BSMMU', 'Mymensingh Medical College', 'Shaheed Suhrawardy Medical College']


def hosp(k):
    return Hospital_Information.objects.get(hospital_id=k) if isinstance(k, int) else Hospital_Information.objects.get(name=k)


def seed_doctors():
    for did, vals in DOCTOR_FIXES.items():
        Doctor_Information.objects.filter(doctor_id=did).update(**vals)
    # attach departments for existing doctors missing them
    Doctor_Information.objects.filter(doctor_id=5).update(
        department_name=hospital_department.objects.get(hospital_id=1, hospital_department_name='Pediatrics'),
        specialization=specialization.objects.get(hospital_id=1, specialization_name='Child Health'))
    Doctor_Information.objects.filter(doctor_id__in=[6, 9]).update(
        department_name=hospital_department.objects.get(hospital_id=4, hospital_department_name='Neurology'),
        specialization=specialization.objects.get(hospital_id=4, specialization_name='Neurosurgeon'))

    for i, (un, name, g, dep, hk, dname, sname, fee, rfee, hour, img, status) in enumerate(NEW_DOCTORS):
        first, last = name.split(' ', 1)
        u = mkuser(un, '%s@healthstack.com.bd' % un.replace('.', ''), first, last, d(-R.randint(200, 420)), is_doctor=True)
        h = hosp(hk)
        dept = hospital_department.objects.get(hospital=h, hospital_department_name=dname)
        spec = specialization.objects.filter(hospital=h, specialization_name=sname).first()
        yr = R.randint(2004, 2016)
        school = R.choice(SCHOOLS)
        Doctor_Information.objects.update_or_create(user=u, defaults=dict(
            name=name, username=un, gender=g, department=dep, department_name=dept, specialization=spec,
            description=DOC_BLURB[dep], featured_image=img, email=u.email,
            phone_number='01%d%08d' % (R.choice([3, 5, 7, 8, 9]), R.randint(0, 99999999)),
            nid=str(R.randint(10**9, 10**10 - 1)), visiting_hour=hour, consultation_fee=fee, report_fee=rfee,
            dob='%d-%02d-%02d' % (yr - 25, R.randint(1, 12), R.randint(1, 28)),
            institute=school, degree=R.choice(['MBBS, FCPS', 'MBBS, MD', 'MBBS, MS', 'MBBS, MRCP (UK)']), completion_year=str(yr),
            work_place=h.name, designation=R.choice(['Consultant', 'Senior Consultant', 'Associate Professor', 'Specialist']),
            start_year=str(yr + 3), end_year='Present', register_status=status, hospital_name=h,
            certificate_image='doctors_certificate/default.png'))

    # education + experience rows for every doctor
    Education.objects.all().delete()
    Experience.objects.all().delete()
    for doc in Doctor_Information.objects.all():
        yr = int(doc.completion_year or 2012)
        Education.objects.create(doctor=doc, degree='MBBS', institute=doc.institute or R.choice(SCHOOLS), year_of_completion=str(yr - 5))
        Education.objects.create(doctor=doc, degree=(doc.degree or 'MBBS, FCPS').split(', ')[-1], institute=R.choice(['BSMMU', 'BCPS', 'NICVD', 'Royal College of Physicians, London']), year_of_completion=str(yr))
        Experience.objects.create(doctor=doc, work_place_name=R.choice(['Dhaka Medical College Hospital', 'Holy Family Red Crescent Hospital', 'BIRDEM General Hospital', 'Upazila Health Complex, Savar']),
                                  from_year=str(yr - 4), to_year=str(yr), designation=R.choice(['Medical Officer', 'Registrar', 'Resident']))
        Experience.objects.create(doctor=doc, work_place_name=doc.work_place or (doc.hospital_name.name if doc.hospital_name else ''),
                                  from_year=str(yr + 1), to_year='Present', designation=doc.designation or 'Consultant')


PATIENT_FIXES = {
    1: dict(name='Moumy Kabir', age=24, dob='1999-02-18', address='House 12, Road 5, Dhanmondi, Dhaka', blood_group='B+', history='Seasonal allergic rhinitis', phone_number=1712456630, nid='19993011245678'),
    2: dict(name='Fayaz Rayhan', age=29, dob='1997-04-11', address='Flat 6B, House 34, Road 11, Banani, Dhaka 1213', blood_group='A+', history='Mild hypertension (since 2025), occasional migraine. Allergic to penicillin.', phone_number=1819237745, nid='19972692533147'),
    3: dict(name='Ammana Nowshin Akhter', age=32, dob='1994-01-20', address='Mirpur DOHS, Dhaka', blood_group='A+', history='Hypothyroidism', phone_number=1678890012),
    4: dict(name='Bristy Haque', age=27, dob='1999-09-18', address='Uttara Sector 7, Dhaka', blood_group='A+', history='None', phone_number=1911345678),
    5: dict(name='Zohora Nipa', age=31, dob='1995-09-18', address='Mohammadpur, Dhaka', blood_group='B+', history='Gestational diabetes (2024)', phone_number=1556123499),
    6: dict(name='Sanoara Propa', age=24, dob='2002-09-13', address='Bashundhara R/A, Dhaka', blood_group='O+', history='None', phone_number=1733221100),
}
FIRST_M = ['Arif', 'Sabbir', 'Rakib', 'Nayeem', 'Tanvir', 'Shahriar', 'Mehedi', 'Rifat', 'Asif', 'Zahid', 'Habib', 'Rashed', 'Imtiaz', 'Saif', 'Nafis', 'Abdul', 'Mizanur', 'Shafiq']
FIRST_F = ['Tasnim', 'Nabila', 'Farzana', 'Sumaiya', 'Jannat', 'Mahjabin', 'Rumana', 'Sadia', 'Lamia', 'Afsana', 'Sharmin', 'Tahsin', 'Anika', 'Rehana', 'Fatema', 'Nasrin']
LAST = ['Rahman', 'Hossain', 'Islam', 'Ahmed', 'Chowdhury', 'Khan', 'Akter', 'Sarker', 'Talukder', 'Mia', 'Bhuiyan', 'Siddique', 'Majumder', 'Uddin', 'Karim', 'Begum', 'Das', 'Roy']
AREAS = ['Gulshan 1', 'Banani', 'Dhanmondi 27', 'Mohammadpur', 'Mirpur 10', 'Uttara Sector 4', 'Bashundhara R/A', 'Badda', 'Rampura', 'Tejgaon', 'Lalmatia', 'Shyamoli', 'Khilgaon', 'Motijheel', 'Wari', 'Old Dhaka, Lalbagh', 'Savar', 'Narayanganj']
HISTORIES = ['None', 'none', 'Type 2 diabetes, on metformin', 'Asthma since childhood', 'Hypertension', 'No known illness', 'Thyroid (hypo), on levothyroxine',
             'Previous appendectomy (2019)', 'Iron-deficiency anaemia', 'Kidney stone 2023', 'GERD', '', 'Dengue fever Aug 2025, recovered', 'Allergic to sulfa drugs']
BLOOD = ['A+', 'A+', 'B+', 'B+', 'O+', 'O+', 'O+', 'AB+', 'A-', 'B-', 'O-']


def seed_patients(n_new=38):
    for pid, vals in PATIENT_FIXES.items():
        Patient.objects.filter(patient_id=pid).update(**vals)
    used = set(User.objects.values_list('username', flat=True))
    for i in range(n_new):
        g = R.random() < 0.5
        first = R.choice(FIRST_M if g else FIRST_F)
        last = R.choice(LAST)
        un = (first + '.' + last).lower()
        while un in used:
            un = (first + last[:3] + str(R.randint(1, 99))).lower()
        used.add(un)
        age = R.randint(4, 78)
        joined = d(-R.randint(20, 400))
        u = mkuser(un, '%s@%s' % (un.replace('.', '_'), R.choice(['gmail.com', 'yahoo.com', 'outlook.com', 'gmail.com'])), first, last, joined, is_patient=True)
        dob = dt.date(TODAY.year - age, R.randint(1, 12), R.randint(1, 28))
        Patient.objects.update_or_create(user=u, defaults=dict(
            name='%s %s' % (first, last), username=un, age=age, email=u.email,
            phone_number=int('1%d%08d' % (R.choice([3, 5, 6, 7, 8, 9]), R.randint(0, 99999999))),
            address='House %d, Road %d, %s, Dhaka' % (R.randint(1, 120), R.randint(1, 30), R.choice(AREAS)),
            blood_group=R.choice(BLOOD), history=R.choice(HISTORIES), dob=dob.isoformat(),
            nid=str(R.randint(10**12, 10**13 - 1)) if age >= 18 else '',
            serial_number=rid(6), login_status='offline'))
    User.objects.filter(patient__isnull=False).update(password=PW_HASH)


def seed_staff():
    User.objects.filter(username__in=['admin', 'moumy', 'jawwad', 'fida', 'mamoni', 'fayaz', 'nowshin', 'aysha', 'mimo', 'pranto',
                                      'shafique', 'tarek', 'nafisa', 'Kaniz', 'sanji', 'Noyon', 'tarin', 'zoro', 'bristy', 'nipa', 'propa']
                        ).update(password=PW_HASH)
    Admin_Information.objects.filter(username='fida').update(name='Mohammed Jawwadul Islam', role='hospital', hospital_id=1, phone_number=1715199382)
    Clinical_Laboratory_Technician.objects.filter(username='mamoni').update(name='Jill Akhter', age=27, hospital_id=1, phone_number=1751516612)
    Clinical_Laboratory_Technician.objects.filter(username='zoro').update(name='Zubair Rahman', age=31, hospital_id=3, phone_number=1724334590)
    for un, name, age, hid in [('tarek', 'Tarek Aziz', 29, 2), ('shafique', 'Shafiqul Islam', 35, 4)]:
        u = User.objects.get(username=un)
        Clinical_Laboratory_Technician.objects.update_or_create(user=u, defaults=dict(name=name, username=un, age=age, email=u.email, hospital_id=hid, phone_number=1700000000 + R.randint(0, 9999999)))
        u.is_labworker, u.is_pharmacist = True, False
        u.save()
    for un, name, deg, age in [('nafisa', 'Nafisa Akhter', 'B.Pharm (DU)', 26), ('tarin', 'Tarin Sultana', 'M.Pharm (NSU)', 28)]:
        Pharmacist.objects.filter(username=un).update(name=name, degree=deg, age=age, phone_number=1800000000 + R.randint(0, 9999999))


# ---------------------------------------------------------------- catalogue
TESTS = [('Complete Blood Count (CBC)', 400), ('Lipid Profile', 1200), ('HbA1c', 1100), ('Fasting Blood Sugar', 150), ('Serum Creatinine', 350),
         ('Thyroid Profile (TSH, FT4)', 1500), ('Urine R/E', 250), ('Chest X-Ray P/A View', 600), ('ECG (12 lead)', 400), ('Echocardiography', 2500),
         ('Ultrasonography Whole Abdomen', 2200), ('Liver Function Test (SGPT)', 450), ('Serum Electrolytes', 900), ('Dengue NS1 Antigen', 500),
         ('MRI Brain (with contrast)', 9500), ('Vitamin D (25-OH)', 2800), ('CRP', 700), ('Troponin I', 1600)]

MEDS = [  # name, weight, type, category, price, stock, rx, image, description
    ('Napa', '500 mg', 'tablets', 'fever', 12, 1240, 'no', 'medicines/medicen-121-scaled_cPXsVSx.jpg', 'Paracetamol 500 mg. For fever, headache and mild to moderate pain. Strip of 10 tablets.'),
    ('Cosec', '20 mg', 'capsule', 'digestivehealth', 70, 320, 'no', 'medicines/Cosec-Capsule-20-mg_Pfdc7oQ.jpg', 'Omeprazole 20 mg. For gastric ulcer, GERD and acidity. Strip of 10 capsules.'),
    ('Alcet', '5 mg', 'tablets', 'allergy', 30, 410, 'no', 'medicines/Alcet_5mg_Tab-400x400_jChl0bd.jpg', 'Levocetirizine 5 mg. Allergic rhinitis, urticaria. Strip of 10.'),
    ('Alatrol', '10 mg', 'tablets', 'allergy', 35, 380, 'no', 'medicines/Alatrol-Tablet_zb8mVnI.jpg', 'Cetirizine 10 mg for sneezing, runny nose and itchy eyes.'),
    ('Seclo', '20 mg', 'capsule', 'digestivehealth', 60, 500, 'no', 'medicines/Seclo-20mg-1_sj212wl.jpg', 'Omeprazole 20 mg, for heartburn and peptic ulcer.'),
    ('Napa Extend', '665 mg', 'tablets', 'pain', 20, 640, 'no', 'medicines/medicen-121-scaled.jpg', 'Extended-release paracetamol for long-lasting relief of joint and muscle pain.'),
    ('Ace Plus', '500 mg + 65 mg', 'tablets', 'fever', 25, 900, 'no', 'medicines/default.png', 'Paracetamol + caffeine for tension headache and fever.'),
    ('Fexo', '120 mg', 'tablets', 'allergy', 90, 210, 'no', 'medicines/default.png', 'Fexofenadine 120 mg, non-drowsy antihistamine.'),
    ('Montair', '10 mg', 'tablets', 'asthma', 160, 150, 'yes', 'medicines/default.png', 'Montelukast 10 mg for asthma prophylaxis and allergic rhinitis.'),
    ('Azithrocin', '500 mg', 'tablets', 'infection', 120, 95, 'yes', 'medicines/default.png', 'Azithromycin 500 mg antibiotic. Complete the full course as prescribed.'),
    ('Ciprocin', '500 mg', 'tablets', 'infection', 150, 80, 'yes', 'medicines/default.png', 'Ciprofloxacin 500 mg for urinary and GI infections.'),
    ('Sergel', '20 mg', 'capsule', 'digestivehealth', 70, 440, 'no', 'medicines/default.png', 'Esomeprazole 20 mg.'),
    ('Maxpro', '20 mg', 'tablets', 'digestivehealth', 70, 360, 'no', 'medicines/default.png', 'Esomeprazole magnesium 20 mg, for acid reflux.'),
    ('Comet', '500 mg', 'tablets', 'diabetes', 60, 300, 'yes', 'medicines/default.png', 'Metformin 500 mg. Take with meals.'),
    ('Secrin', '2 mg', 'tablets', 'diabetes', 80, 0, 'yes', 'medicines/default.png', 'Glimepiride 2 mg. Currently out of stock - restock expected next week.'),
    ('Osartil', '50 mg', 'tablets', 'bloodpressure', 100, 220, 'yes', 'medicines/default.png', 'Losartan potassium 50 mg for hypertension.'),
    ('Bisocor', '2.5 mg', 'tablets', 'bloodpressure', 75, 180, 'yes', 'medicines/default.png', 'Bisoprolol 2.5 mg beta-blocker.'),
    ('Amdocal', '5 mg', 'tablets', 'bloodpressure', 50, 260, 'yes', 'medicines/default.png', 'Amlodipine 5 mg.'),
    ('Ecosprin', '75 mg', 'tablets', 'heartdisease', 10, 700, 'yes', 'medicines/default.png', 'Low-dose aspirin for secondary prevention of heart attack and stroke.'),
    ('Rosuva', '10 mg', 'tablets', 'heartdisease', 180, 140, 'yes', 'medicines/default.png', 'Rosuvastatin 10 mg, lowers LDL cholesterol.'),
    ('Clopid', '75 mg', 'tablets', 'heartdisease', 120, 130, 'yes', 'medicines/default.png', 'Clopidogrel 75 mg antiplatelet.'),
    ('Tusca', '100 ml', 'syrup', 'cough', 85, 160, 'no', 'medicines/default.png', 'Dextromethorphan syrup for dry cough. 100 ml bottle.'),
    ('Adovas', '100 ml', 'syrup', 'cough', 70, 210, 'no', 'medicines/default.png', 'Herbal cough syrup (Adhatoda vasica).'),
    ('Fenadin', '60 ml', 'syrup', 'cold', 65, 120, 'no', 'medicines/default.png', 'Fexofenadine paediatric suspension.'),
    ('Ceevit', '250 mg', 'tablets', 'vitamins', 25, 820, 'no', 'medicines/default.png', 'Vitamin C chewable tablets, orange flavour.'),
    ('Calbo-D', '500 mg', 'tablets', 'vitamins', 110, 340, 'no', 'medicines/default.png', 'Calcium carbonate + Vitamin D3.'),
    ('D-Rise', '40000 IU', 'capsule', 'vitamins', 240, 90, 'no', 'medicines/default.png', 'Vitamin D3 weekly capsule.'),
    ('Neuro-B', '-', 'tablets', 'nurological', 90, 260, 'no', 'medicines/default.png', 'Vitamin B1, B6, B12 combination for nerve health.'),
    ('Pregaba', '75 mg', 'capsule', 'nurological', 150, 70, 'yes', 'medicines/default.png', 'Pregabalin 75 mg for neuropathic pain.'),
    ('Sumatab', '50 mg', 'tablets', 'pain', 200, 45, 'yes', 'medicines/default.png', 'Sumatriptan 50 mg for acute migraine attacks.'),
    ('Orsaline-N', '25 g', 'general', 'digestivehealth', 6, 2000, 'no', 'medicines/default.png', 'Oral rehydration salts. Dissolve one sachet in 500 ml clean water.'),
    ('Betnovate-N', '15 g', 'general', 'skin', 95, 110, 'no', 'medicines/default.png', 'Betamethasone + neomycin cream for inflamed skin conditions.'),
    ('Ketocon', '2%', 'general', 'skin', 180, 60, 'no', 'medicines/default.png', 'Ketoconazole shampoo for dandruff and seborrhoeic dermatitis.'),
    ('Optimox', '5 ml', 'general', 'eye', 140, 75, 'yes', 'medicines/default.png', 'Moxifloxacin eye drops for bacterial conjunctivitis.'),
    ('Otosporin', '5 ml', 'general', 'ear', 120, 40, 'yes', 'medicines/default.png', 'Ear drops for outer ear infection.'),
    ('Tamiflu', '75 mg', 'capsule', 'flu', 650, 12, 'yes', 'medicines/default.png', 'Oseltamivir for influenza. Limited stock.'),
]


def seed_catalogue():
    Test_Information.objects.filter(test_id=1).update(test_name='Blood Grouping & Rh', test_price='250')
    Test_Information.objects.filter(test_id=2).update(test_name='Visual Acuity / Eye Test', test_price='300')
    Test_Information.objects.filter(test_id=3).update(test_name='CBC with ESR', test_price='500')
    for n, p in TESTS:
        Test_Information.objects.get_or_create(test_name=n, defaults={'test_price': str(p)})
    for i, (n, w, t, c, p, s, rx, img, desc) in enumerate(MEDS):
        Medicine.objects.update_or_create(name=n, defaults=dict(
            medicine_id='MED-%04d' % (101 + i), weight=w, medicine_type=t, medicine_category=c, price=p,
            stock_quantity=s, quantity=1, Prescription_reqiuired=rx, featured_image=img, description=desc))


# ---------------------------------------------------------------- activity
COMPLAINTS = ['Chest tightness when climbing stairs for 2 weeks', 'Follow-up after lipid profile', 'BP readings around 150/95 at home',
              'Recurrent headache, worse in the morning', 'Child has fever 102F for 3 days', 'Skin rash on both arms, itchy',
              'Routine check-up', 'Review of ECG report', 'Knee pain after a fall', 'Persistent dry cough since last month',
              'Dizziness and fatigue', 'Want to discuss MRI result', 'Acidity and bloating after meals', 'Second opinion before surgery',
              'Vaccination schedule for my son', '', '', 'Sugar level high (FBS 9.1)', 'Numbness in fingers', 'Ear pain and blocked feeling']
MED_PLANS = [
    ('Osartil 50 mg', '1 tablet', '30 days', '1-0-0', 'After meal', 'Check BP every morning and keep a log.'),
    ('Ecosprin 75 mg', '1 tablet', 'Continue', '0-1-0', 'After meal', 'Do not stop without consulting.'),
    ('Rosuva 10 mg', '1 tablet', '3 months', '0-0-1', 'After meal', ''),
    ('Napa 500 mg', '1 tablet', '5 days', '1-1-1', 'After meal', 'Only if temperature above 100F.'),
    ('Sergel 20 mg', '1 capsule', '14 days', '1-0-1', 'Before meal', 'Take 30 minutes before breakfast and dinner.'),
    ('Alatrol 10 mg', '1 tablet', '7 days', '0-0-1', 'After meal', 'May cause drowsiness.'),
    ('Azithrocin 500 mg', '1 tablet', '3 days', '1-0-0', 'Before meal', 'Complete the full course.'),
    ('Montair 10 mg', '1 tablet', '1 month', '0-0-1', 'After meal', ''),
    ('Comet 500 mg', '1 tablet', '3 months', '1-0-1', 'After meal', 'Avoid sugary drinks; walk 30 minutes daily.'),
    ('Sumatab 50 mg', '1 tablet', 'As needed', 'SOS', 'After meal', 'At onset of migraine; max 2 tablets in 24 hours.'),
    ('Neuro-B', '1 tablet', '2 months', '1-0-0', 'After meal', ''),
    ('Calbo-D', '1 tablet', '3 months', '0-1-0', 'After meal', ''),
    ('Tusca syrup', '2 tsp', '5 days', '1-1-1', 'After meal', ''),
    ('Betnovate-N cream', 'Thin layer', '10 days', '1-0-1', '-', 'Apply on affected area only.'),
    ('Pregaba 75 mg', '1 capsule', '1 month', '0-0-1', 'After meal', 'Can cause dizziness initially.'),
]
ADVICE = ['Reduce salt intake, avoid fried food. Follow up after 1 month with reports.', 'Drink plenty of water. Come back if fever persists beyond 3 days.',
          'Sleep at least 7 hours; limit screen time in the evening.', 'Follow-up after 2 weeks.', '', 'Low-fat diet, daily walking. Repeat lipid profile in 3 months.',
          'Avoid NSAIDs on empty stomach. Revisit if black stool or vomiting.', 'Physiotherapy 3 times a week for 4 weeks. Use knee support while walking.',
          'Consult a doctor after the report.']
REPORT_RESULTS = {
    'Complete Blood Count (CBC)': [('Haemoglobin', '13.8', 'g/dL', '13.0 - 17.0'), ('WBC count', '7,200', '/cmm', '4,000 - 11,000'), ('Platelet count', '2,45,000', '/cmm', '1,50,000 - 4,00,000'), ('ESR', '18', 'mm/1st hr', '0 - 15')],
    'Lipid Profile': [('Total cholesterol', '226', 'mg/dL', '< 200'), ('LDL', '148', 'mg/dL', '< 100'), ('HDL', '38', 'mg/dL', '> 40'), ('Triglycerides', '190', 'mg/dL', '< 150')],
    'HbA1c': [('HbA1c', '6.9', '%', '4.0 - 5.6')],
    'Thyroid Profile (TSH, FT4)': [('TSH', '3.12', 'mIU/L', '0.4 - 4.0'), ('Free T4', '1.1', 'ng/dL', '0.8 - 1.8')],
    'Serum Creatinine': [('Serum creatinine', '0.94', 'mg/dL', '0.7 - 1.3')],
    'Liver Function Test (SGPT)': [('SGPT (ALT)', '52', 'U/L', '< 41')],
    'Dengue NS1 Antigen': [('Dengue NS1 Ag', 'Negative', '-', 'Negative')],
    'Serum Electrolytes': [('Sodium', '139', 'mmol/L', '135 - 145'), ('Potassium', '4.2', 'mmol/L', '3.5 - 5.1'), ('Chloride', '101', 'mmol/L', '98 - 107')],
    'Fasting Blood Sugar': [('Fasting glucose', '6.4', 'mmol/L', '3.9 - 5.5')],
    'Vitamin D (25-OH)': [('25-OH Vitamin D', '17.5', 'ng/mL', '30 - 100')],
    'Troponin I': [('Troponin I', '< 0.01', 'ng/mL', '< 0.04')],
}
SPECIMEN_FOR = {'Urine R/E': 'Urine'}
CHAT_SCRIPTS = [
    [('p', 'Assalamualaikum doctor, I uploaded my lipid profile. LDL came 148.'), ('d', 'Walaikum assalam. I saw it. It is high but manageable. Are you taking Rosuva every night?'),
     ('p', 'I missed a few days last week honestly.'), ('d', 'Please try to be regular, and cut down on fried food. We will repeat the test in 3 months.'), ('p', 'Ok, thank you doctor.')],
    [('p', 'Doctor, my BP this morning was 148/96. Should I take an extra Osartil?'), ('d', 'No, do not double the dose. Measure again after 30 minutes of rest and let me know.'),
     ('p', 'Second reading 138/90.'), ('d', 'That is acceptable for now. Keep logging for a week and bring the log to the next visit.')],
    [('p', 'Hello, the headache came back yesterday evening. Took Sumatab, it helped after an hour.'), ('d', 'Good that it worked. How many attacks this month?'),
     ('p', '3 so far'), ('d', 'If it goes above 4 a month we will start a preventive medicine. Keep the headache diary please.'), ('p', 'Will do 👍')],
    [('d', 'Your appointment for tomorrow is confirmed. Please bring your previous ECG.'), ('p', 'Thanks! Is it ok if I come 15 minutes late? Traffic in Mohakhali is terrible'), ('d', 'Fine, the serial will be held for you.')],
]


def seed_activity():
    patients = list(Patient.objects.all())
    primary = Patient.objects.get(username=PRIMARY)
    others = [p for p in patients if p.patient_id != primary.patient_id]
    doctors = list(Doctor_Information.objects.filter(register_status='Accepted'))
    prim_docs = [Doctor_Information.objects.get(doctor_id=i) for i in (2, 6, 7)] + list(Doctor_Information.objects.filter(username__in=['rafiq.ahmed', 'arif.chowdhury']))
    tests = list(Test_Information.objects.all())

    # wipe old transactional demo rows (placeholder text) and rebuild
    for M in (Payment, testOrder, testCart, Order, Cart, Prescription_test, Prescription_medicine, Prescription, Test, Specimen, Report, Appointment, Doctor_review, chatMessages):
        M.objects.all().delete()

    def make_payment(patient, amount, kind, when, appointment=None, prescription=None, status='VALID', cons=None, rep=None, order=None):
        tran = rid(8, 'SSLCZ_TEST_')
        card = R.choice([('BKASH-BKash', 'BKash Mobile Banking', '01711XXXX%02d'), ('NAGAD-Nagad', 'Nagad', '01819XXXX%02d'),
                         ('VISA-Dutch Bangla', 'DUTCH-BANGLA BANK LIMITED', '432155XXXXXX%04d'), ('MASTER-City Bank', 'CITY BANK LIMITED', '520473XXXXXX%04d'),
                         ('BKASH-BKash', 'BKash Mobile Banking', '01711XXXX%02d')])
        valid = status == 'VALID'
        p = Payment.objects.create(
            invoice_number='#INV-%04d' % R.randint(1000, 9999), patient=patient, appointment=appointment, prescription=prescription, order=order,
            payment_type=kind, name=patient.username, email=patient.email, phone=str(patient.phone_number), address=patient.address,
            city='Dhaka', country='Bangladesh', transaction_id=tran,
            val_transaction_id=(when.strftime('%y%m%d') + rid(10)) if valid else None,
            currency_amount=('%.2f' % amount) if valid else None, consulation_fee=cons, report_fee=rep,
            card_type=card[0] if valid else None, card_no=(card[2] % R.randint(10, 99)) if valid else None,
            bank_transaction_id=(when.strftime('%y%m%d%H%M') + rid(6, '')) if valid else None,
            status=status if valid else None,
            transaction_date=(dt.datetime.combine(when, dt.time(R.randint(9, 22), R.randint(0, 59), R.randint(0, 59))).strftime('%Y-%m-%d %H:%M:%S')) if valid else None,
            currency='BDT' if valid else None, card_issuer=card[1] if valid else None,
            card_brand=('MOBILEBANKING' if 'Kash' in card[0] or 'Nagad' in card[0] else card[0].split('-')[0]) if valid else None)
        return p

    def make_appt(patient, doc, offset, status=None, atype=None, msg=None):
        date = d(offset)
        if status is None:
            if offset < -1:
                status = R.choices(['confirmed', 'cancelled', 'pending'], [80, 14, 6])[0]
            else:
                status = R.choices(['confirmed', 'pending'], [55, 45])[0]
        atype = atype or R.choices(['checkup', 'report'], [75, 25])[0]
        paid = status == 'confirmed' and (offset < 0 or R.random() < 0.7)
        if status == 'pending' and R.random() < 0.25:
            paid = True
        a = Appointment.objects.create(date=date, time=slot(), doctor=doc, patient=patient, appointment_type=atype, appointment_status=status,
                                       serial_number=rid(8), payment_status='VALID' if paid else 'pending',
                                       message=msg if msg is not None else R.choice(COMPLAINTS))
        if paid:
            fee = doc.consultation_fee or 1000
            rfee = doc.report_fee or 500
            p = make_payment(patient, fee + rfee, 'appointment', date - dt.timedelta(days=R.randint(0, 3)), appointment=a, cons=str(fee), rep=str(rfee))
            a.transaction_id = p.transaction_id
            a.save()
        return a

    # primary patient: ~8 months of history plus upcoming visits
    prim_plan = [(-236, 0, 'confirmed'), (-210, 0, 'confirmed'), (-181, 2, 'confirmed'), (-160, 1, 'cancelled'), (-150, 1, 'confirmed'),
                 (-122, 0, 'confirmed'), (-95, 3, 'confirmed'), (-71, 2, 'confirmed'), (-44, 1, 'confirmed'), (-30, 4, 'confirmed'),
                 (-12, 0, 'confirmed'), (-5, 3, 'pending'), (0, 1, 'confirmed'), (3, 0, 'confirmed'), (9, 4, 'pending'), (21, 2, 'pending')]
    prim_appts = [make_appt(primary, prim_docs[i % len(prim_docs)], off, st) for off, i, st in prim_plan]

    # everyone else
    for p in others:
        for _ in range(R.randint(1, 6)):
            make_appt(p, R.choice(doctors), R.randint(-240, 30))
    # make sure every accepted doctor has something today / tomorrow
    for doc in doctors:
        for off in (0, 0, 1):
            make_appt(R.choice(others), doc, off, status='confirmed' if off == 0 else None)

    # prescriptions & reports for past confirmed appointments
    past = Appointment.objects.filter(appointment_status='confirmed', date__lt=TODAY).select_related('doctor', 'patient')
    for a in past:
        is_prim = a.patient_id == primary.patient_id
        if not is_prim and R.random() < 0.45:
            continue
        pres = Prescription.objects.create(doctor=a.doctor, patient=a.patient, create_date=a.date.isoformat(), extra_information=R.choice(ADVICE))
        for mp in R.sample(MED_PLANS, R.randint(1, 4)):
            Prescription_medicine.objects.create(prescription=pres, medicine_name=mp[0], quantity=mp[1], duration=mp[2], frequency=mp[3], relation_with_meal=mp[4], instruction=mp[5])
        ptests = []
        for t in R.sample(tests, R.choices([0, 1, 2, 3], [25, 35, 30, 10])[0]):
            recent = (TODAY - a.date).days < 20
            paid = (not recent and R.random() < 0.85) or R.random() < 0.3
            ptests.append(Prescription_test.objects.create(prescription=pres, test_name=t.test_name, test_description=R.choice(['Fasting 10-12 hours', 'Morning sample', '', 'Bring previous report', 'Urgent']),
                                                           test_info_id=str(t.test_id), test_info_price=t.test_price, test_info_pay_status='paid' if paid else 'unpaid'))
        paid_tests = [t for t in ptests if t.test_info_pay_status == 'paid']
        if paid_tests:
            total = sum(float(t.test_info_price) for t in paid_tests) + 20
            make_payment(a.patient, total, 'test', a.date + dt.timedelta(days=R.randint(0, 2)), prescription=pres)
            # lab reports for results already delivered
            for t in paid_tests:
                if (TODAY - a.date).days < 3:
                    continue
                coll = a.date + dt.timedelta(days=R.randint(0, 2))
                rep = Report.objects.create(doctor=a.doctor, patient=a.patient, test_name=t.test_name, delivery_date=(coll + dt.timedelta(days=R.randint(1, 3))).isoformat(),
                                            other_information=R.choice(['', 'Sample slightly haemolysed', 'Repeat after 3 months', 'Reviewed by Dr. on duty', 'Fasting sample']))
                Specimen.objects.create(report=rep, specimen_type=SPECIMEN_FOR.get(t.test_name, 'Blood (EDTA)' if 'CBC' in t.test_name else 'Serum'),
                                        collection_date=coll.isoformat(), receiving_date=coll.isoformat())
                for tn, res, unit, ref in REPORT_RESULTS.get(t.test_name, [(t.test_name, R.choice(['Normal', 'Within normal limits', 'No abnormality detected']), '-', 'Normal')]):
                    Test.objects.create(report=rep, test_name=tn, result=res, unit=unit, referred_value=ref)

    # test cart left open by the primary patient (unpaid tests from the latest prescription)
    last_pres = Prescription.objects.filter(patient=primary).order_by('-create_date').first()
    if last_pres:
        unpaid = Prescription_test.objects.filter(prescription=last_pres, test_info_pay_status='unpaid')
        if not unpaid.exists():
            t = tests[1]
            unpaid = [Prescription_test.objects.create(prescription=last_pres, test_name=t.test_name, test_description='Fasting 10-12 hours', test_info_id=str(t.test_id), test_info_price=t.test_price, test_info_pay_status='unpaid')]
        order = testOrder.objects.create(user=primary.user, ordered=False)
        for t in unpaid:
            order.orderitems.add(testCart.objects.create(user=primary.user, item=t, name=t.test_name))

    # pharmacy orders
    meds = list(Medicine.objects.filter(stock_quantity__gt=0))
    for p in [primary] * 6 + R.sample(others, 18):
        when = d(-R.randint(2, 220))
        order = Order.objects.create(user=p.user, ordered=True, payment_status='VALID', trans_ID=rid(8, 'SSLCZ_TEST_'))
        for m in R.sample(meds, R.randint(1, 4)):
            order.orderitems.add(Cart.objects.create(user=p.user, item=m, quantity=R.randint(1, 3), purchased=True))
        Order.objects.filter(pk=order.pk).update(created=timezone.make_aware(dt.datetime.combine(when, dt.time(R.randint(9, 22), R.randint(0, 59)))))
        pay = make_payment(p, float(order.final_bill()), 'pharmacy', when, order=order)
        Order.objects.filter(pk=order.pk).update(trans_ID=pay.transaction_id)
    # current, not yet checked-out cart for the primary patient
    cart_order = Order.objects.create(user=primary.user, ordered=False)
    for name, q in [('Napa Extend', 2), ('Calbo-D', 1), ('Orsaline-N', 6)]:
        cart_order.orderitems.add(Cart.objects.create(user=primary.user, item=Medicine.objects.get(name=name), quantity=q, purchased=False))

    # a few abandoned / failed payment attempts (messiness)
    for p in R.sample(patients, 5):
        make_payment(p, 0, R.choice(['appointment', 'pharmacy']), d(-R.randint(5, 200)), status='FAILED')

    # doctor reviews
    review_txt = [('Very patient and thorough', 'Explained everything about my BP medicines and did not rush the visit even though the chamber was crowded.'),
                  ('Helpful', 'Good doctor. Waiting time was long (almost 1.5 hours) but the consultation was worth it.'),
                  ('Highly recommended', 'My mother had chest pain and Dr. took immediate action. Forever grateful.'),
                  ('Average experience', 'Prescription was fine but I felt the visit was too short.'),
                  ('Excellent with kids', 'My 4 year old is usually scared of doctors but she was so calm with him.'),
                  ('Clear explanation', 'Went through my MRI line by line. Finally understood what was going on.'),
                  ('Good', 'Nice behaviour.'), ('Life saver', 'Diagnosed my dengue early, followed up on phone every day.'),
                  ('Not satisfied', 'Appointment was confirmed but I had to wait more than two hours past my serial.'),
                  ('Professional', 'Punctual, professional and the online booking + payment worked smoothly.')]
    for doc in doctors:
        for p in R.sample(patients, R.randint(1, 5)):
            t, m = R.choice(review_txt)
            Doctor_review.objects.create(doctor=doc, patient=p, title=t, message=m)

    # chat between the primary patient and doctors
    base = timezone.now() - dt.timedelta(days=40)
    for i, script in enumerate(CHAT_SCRIPTS):
        doc = prim_docs[i % len(prim_docs)]
        t0 = base + dt.timedelta(days=i * 9, hours=R.randint(0, 10))
        for j, (who, msg) in enumerate(script):
            frm, to = (primary.user, doc.user) if who == 'p' else (doc.user, primary.user)
            chatMessages.objects.create(user_from=frm, user_to=to, message=msg, date_created=t0 + dt.timedelta(minutes=j * R.randint(2, 25)))
    # other patients chatting with Dr. Jawwadul
    jaw = Doctor_Information.objects.get(doctor_id=2)
    for p in R.sample(others, 4):
        t0 = timezone.now() - dt.timedelta(days=R.randint(1, 30))
        chatMessages.objects.create(user_from=p.user, user_to=jaw.user, message=R.choice(['Doctor, can I take Napa with my BP medicine?', 'Report is ready, shall I send a photo?', 'Thank you for today.', 'Is the chamber open on Friday?']), date_created=t0)
        chatMessages.objects.create(user_from=jaw.user, user_to=p.user, message=R.choice(['Yes, that is safe.', 'Please upload it through HealthStack, I will review tonight.', 'You are welcome. Take care.', 'No, Friday is closed. Saturday from 12 pm.']), date_created=t0 + dt.timedelta(minutes=R.randint(5, 90)))


@transaction.atomic
def main():
    seed_hospitals()
    seed_doctors()
    seed_staff()
    seed_patients()
    seed_catalogue()
    seed_activity()
    print('seeded: %d hospitals, %d doctors, %d patients, %d appointments, %d prescriptions, %d reports, %d payments, %d medicines' % (
        Hospital_Information.objects.count(), Doctor_Information.objects.count(), Patient.objects.count(), Appointment.objects.count(),
        Prescription.objects.count(), Report.objects.count(), Payment.objects.count(), Medicine.objects.count()))


if __name__ == '__main__':
    main()
