# Transformer - quick reference

Scaled dot-product attention:

$$\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V$$

- base: $d_{model}=512$, $h=8$, $d_k=d_v=64$, $d_{ff}=2048$, $N=6$
- sinusoidal PE (later replaced by learned / [RoPE](SPJ3P0E0DY) / ALiBi)
- post-LN in the original; pre-LN is what everyone uses now
- label smoothing 0.1, warmup 4000 steps, inverse sqrt decay

For TA section: good figure for explaining multi-head attention is Fig. 2.
