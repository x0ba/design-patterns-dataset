# FlashAttention

Core point: attention is **memory-bound**, not compute-bound. Count HBM reads/writes, not FLOPs.

- tile Q, K, V into blocks that fit in SRAM
- online softmax (keep running max $m$ and normalizer $\ell$ per row)
- backward: recompute attention from Q,K,V blocks + saved $(m, \ell)$ instead of storing $n \times n$ matrix

HBM accesses: $\Theta(N^2 d^2 M^{-1})$ vs $\Theta(Nd + N^2)$ for standard.

Practical: `attn_implementation="flash_attention_2"` in HF. Works with Longformer? **No** - sliding window needs custom kernel. Mistral-style SWA is supported though.
