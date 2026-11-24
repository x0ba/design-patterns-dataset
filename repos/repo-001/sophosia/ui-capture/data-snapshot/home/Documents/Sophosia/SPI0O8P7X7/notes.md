# S4

Continuous-time SSM: $x'(t) = Ax(t) + Bu(t)$, $y(t) = Cx(t) + Du(t)$

HiPPO init for $A$ -> memorizes history via Legendre projection. Naive computation of the SSM convolution kernel $\bar{K}$ is too slow; NPLR (normal plus low-rank) decomposition + Cauchy kernel makes it $\tilde{O}(N + L)$.

First model to solve Path-X (16k length) in LRA.

Successors: S4D (diagonal), S5, H3, Hyena, [Mamba](SPL7V44MTW).
