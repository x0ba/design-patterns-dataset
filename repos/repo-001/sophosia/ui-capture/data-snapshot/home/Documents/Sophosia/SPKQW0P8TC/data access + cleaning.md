# MIMIC data notes

- PhysioNet credentialing renewed 2026-03-14 (CITI training cert expires 2029)
- NOTEEVENTS: 2,083,180 rows; 59,652 discharge summaries
- filter `ISERROR` = 1 rows (886)
- addenda: concatenate to the parent summary by HADM_ID, keep chronological order

Preprocessing pipeline lives in `thesis-code/data/mimic3_prep.py`

Known issues
- de-id placeholders like `[**Hospital 1234**]`, normalize to `[HOSPITAL]`
- some notes have duplicated sections (copy-forward); dedupe at paragraph level? -> discussed w/ Priya, decided **not** to dedupe for main experiments, but report it
