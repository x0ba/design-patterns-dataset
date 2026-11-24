# CAML reproduction

Using the `caml-mimic` repo (py2 originally...). Ported to py3.10, torch 2.1.

- MIMIC-III full (8,922 codes): micro-F1 0.536 (paper 0.539) - ok
- MIMIC-III top-50: micro-F1 0.612 (paper 0.614) - ok
- MIMIC-IV ICD-10 top-50: 0.589 - new number for our table

Word embeddings: word2vec trained on MIMIC notes, dim 100. Took 40 min on CPU.

Note: label-wise attention is the thing that makes it interpretable; see Fig. 3 in the paper. Want the same visualization for my model in Ch5.
