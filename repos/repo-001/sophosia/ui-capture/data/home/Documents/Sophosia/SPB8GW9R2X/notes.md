# Hierarchical transformers (Pappagari et al.)

Segment doc into 200-token chunks w/ 50 overlap -> BERT per chunk -> [CLS] vectors -> LSTM or 1-layer transformer -> classifier.

RoBERT / ToBERT naming. Cheap and strong baseline; my hier-01 run in [Clinical-Longformer](SP6QV5XRKS) run log uses this.
