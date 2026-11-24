# LoRA

$W = W_0 + BA$, $B \in \mathbb{R}^{d \times r}$, $A \in \mathbb{R}^{r \times k}$, $r \ll \min(d,k)$. Init $B=0$ so training starts at $W_0$. Scale by $\alpha / r$.

- applied to $W_q, W_v$ only in the paper; most people now do all linear layers
- r=8 often enough; r=1 surprisingly ok for GPT-3

Used in my Ch4 for the 7B baselines (with [QLoRA](SPQNJGOSZU) for the 13B one).
