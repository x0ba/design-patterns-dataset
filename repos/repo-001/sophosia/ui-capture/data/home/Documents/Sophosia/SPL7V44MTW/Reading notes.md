# Mamba - reading notes

**TL;DR** S4 with input-dependent (selective) $\Delta$, $B$, $C$. Loses the convolution view, so they need a hardware-aware parallel scan instead. Linear in $L$ at train time, constant memory per step at inference.

## Key ideas
- *Selection mechanism*: $B_t = s_B(x_t)$, $C_t = s_C(x_t)$, $\Delta_t = \tau_\Delta(\text{Parameter} + s_\Delta(x_t))$
- Discretization (ZOH): $\bar{A} = \exp(\Delta A)$, $\bar{B} = (\Delta A)^{-1}(\exp(\Delta A) - I)\Delta B$
- Kernel fusion + recomputation: never materializes the $(B, L, D, N)$ state in HBM (same trick as [FlashAttention](SPNOBIMUVN))
- Block = H3-style gated MLP with the SSM in place of attention; no separate MLP block

## Why I care (thesis Ch3)
Discharge summaries are long (median ~1.9k word pieces in our MIMIC-IV split). [Longformer](SPPROS545E) and [BigBird](SPC0GC5KYS) still cost a lot at 4k+. If selective SSMs keep up on *extraction*-style tasks (ICD coding, outcome prediction) this is a cheaper backbone.

> Concern: the synthetic **selective copying** and **induction heads** results look great, but recall-heavy tasks are where SSMs historically lag attention (see H3 paper). ICD coding is basically recall over the whole note.

## Questions for reading group
1. How sensitive is it to the init of $A$ (S4D-Real vs S4D-Lin)?
2. Any results on bidirectional / encoder use? Everything here is causal LM.
3. Is there a clean way to add a few global attention layers (hybrid)? -> Jamba, Zamba do this

## TODO
- [x] read Sec. 3.3 (hardware-aware algorithm) again
- [ ] try `mamba-130m` on our MIMIC-IV-Note ICD-10 top-50 split
- [ ] compare against [Clinical-Longformer](SP6QV5XRKS) at 4096 tokens
- [ ] ask Priya whether the lab still has A100 hours in December
