# Clinical-Longformer / Clinical-BigBird (Li et al., JAMIA 2023)

Closest prior work to my Ch4. **Must cite + compare.**

## Setup
- Continued pre-training of [Longformer](SPPROS545E) and [BigBird](SPC0GC5KYS) on MIMIC-III notes, 4096 max length
- 200k steps, batch 64 (?? check appendix), lr 3e-5
- Tasks: NER (i2b2 2006/2010/2012/2014), QA (emrQA), NLI (MedNLI), classification (MIMIC-AKI, openI)

## Results I care about
| Task | ClinicalBERT | Clinical-Longformer | delta |
|---|---|---|---|
| MIMIC-AKI (AUC) | 0.749 | 0.762 | +1.3 |
| emrQA-relation (EM) | 0.928 | 0.941 | +1.3 |
| i2b2 2014 NER (F1) | 0.946 | 0.954 | +0.8 |

Gains are consistent but **small**. Not clear how much is length vs. extra pre-training compute.

## Gaps / my angle
1. No ICD coding at all, which is the task where truncation hurts most (cf. [CAML](SPN27ORDXH))
2. Only MIMIC-III. We have MIMIC-IV-Note now.
3. No efficiency numbers (memory / throughput). Reviewers will ask.
4. No calibration analysis -> [Guo et al.](SPZ7M00VUY)

Checkpoints: `yikuan8/Clinical-Longformer` on HF hub.
