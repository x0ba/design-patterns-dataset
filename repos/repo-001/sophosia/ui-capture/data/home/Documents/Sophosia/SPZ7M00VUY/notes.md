# Calibration

ECE with 15 bins. Temperature scaling = single scalar $T$ fit on validation NLL.

For multi-label ICD coding, calibrate **per label**? Too few positives for tail codes. Options:
- global temperature across labels
- Platt per frequent label, global for tail
- check reliability diagrams for top-10 codes separately

Relevant to deployment discussion (Ch5): clinicians will see probabilities, not just predicted codes.
