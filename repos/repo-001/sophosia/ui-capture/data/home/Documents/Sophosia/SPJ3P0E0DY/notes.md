# RoPE

Rotate pairs of dims of $q$, $k$ by angle $m\theta_i$, $\theta_i = 10000^{-2i/d}$. Inner product then depends only on $m - n$.

Context extension tricks built on top: position interpolation, NTK-aware scaling, YaRN. Relevant if I extend a 2k-context decoder to 8k for discharge summaries.
