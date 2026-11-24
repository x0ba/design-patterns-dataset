# Clinical outcome prediction (van Aken et al., EACL 2021)

Admission notes only (simulating info available at admission): filter discharge summary to sections Chief Complaint, HPI, Medical History, Admission Meds, Allergies, Physical Exam, Family/Social History.

Tasks: diagnoses (ICD-9 3-digit), procedures, in-hospital mortality, length-of-stay buckets.

Their CORe pretraining: +1-2 AUROC over BioBERT. Their **task definitions are what I'm adopting** for the outcome part of Ch4 - cite clearly.
