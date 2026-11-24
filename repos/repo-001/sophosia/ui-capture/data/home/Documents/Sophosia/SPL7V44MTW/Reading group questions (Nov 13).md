# Reading group - Nov 13

Presenter: me. 45 min + discussion. Slides in Drive /reading-group/2026-fall/mamba.pdf

Attendance: Priya, Jonah, Wen, Marcus, Aisha (+2 from Prof. Okafor's group)

## Discussion notes
- Jonah: the "linear time" claim is about training FLOPs; actual wall-clock depends heavily on the scan kernel. Benchmarks are on H100 only.
- Wen asked about length generalization. Fig. 4 shows extrapolation to 1M on induction heads, but nothing on real text beyond training length.
- Priya: for our use case we should check **bidirectional** variants (Caduceus does this for DNA).
- Everyone agreed the ablation on $\Delta$ selectivity (Table 7) is the most convincing part.

## Follow-ups
- Marcus will present [RingAttention](SP68NMCFBW) on Dec 4
- I owe the group a short comparison table: S4 / H3 / Hyena / Mamba
