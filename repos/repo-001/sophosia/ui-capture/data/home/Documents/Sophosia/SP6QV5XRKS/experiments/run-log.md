# Run log - Clinical-Longformer baseline (MIMIC-IV ICD-10 top-50)

All runs: 4xA100 40GB, fp16, grad accum 4, eff. batch 32, early stopping on dev micro-F1.

| date | run | max_len | lr | epochs | micro-F1 | macro-F1 | P@5 | notes |
|---|---|---|---|---|---|---|---|---|
| 2026-09-02 | clf-01 | 512 | 2e-5 | 20 | 0.611 | 0.534 | 0.602 | truncation baseline |
| 2026-09-03 | clf-02 | 4096 | 2e-5 | 20 | 0.664 | 0.587 | 0.641 | OOM at bs 8, used bs 4 |
| 2026-09-05 | clf-03 | 4096 | 5e-5 | 12 | 0.671 | 0.590 | 0.648 | |
| 2026-09-09 | clf-04 | 4096 | 5e-5 | 12 | 0.402 | 0.211 | 0.398 | **diverged** - forgot warmup, ignore |
| 2026-09-10 | clf-05 | 4096 | 5e-5 | 12 | 0.673 | 0.594 | 0.650 | warmup 10%, seed 2 |
| 2026-09-18 | hier-01 | 8x512 | 3e-5 | 15 | 0.659 | 0.571 | 0.637 | [hierarchical](SPB8GW9R2X) ClinicalBERT, max-pool |

Takeaways so far
- 4096 helps (+5-6 micro-F1) but costs ~3.1x wall-clock per epoch
- hierarchical is surprisingly close and much cheaper; need attention pooling instead of max-pool
- seed variance on macro-F1 is ~1 pt, need 3 seeds for final table
