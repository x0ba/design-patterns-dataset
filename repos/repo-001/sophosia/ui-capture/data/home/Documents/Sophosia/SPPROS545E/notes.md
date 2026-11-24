# Longformer

- sliding window attention, window $w$ per layer (512 typical), dilated windows in upper layers for char-LM
- **global attention** on task tokens: [CLS] for classification, question tokens for QA
- separate projections $Q_g, K_g, V_g$ for global attention
- copy RoBERTa position embeddings 8x to init 4096 positions -> cheap continued pretraining

Complexity: $O(n \cdot w)$ instead of $O(n^2)$.

Impl detail I keep forgetting: needs `attention_window` to be a multiple of 2 and input padded to multiple of window size.

See also [BigBird](SPC0GC5KYS), [Tay survey](SPFF6HDCRA) Sec 3.
