// Hand-written note content for the seeded library.
// Links use Sophosia's markdown link form [label](projectId).
const T = {
  attn: "Attention Is All You Need",
  bert: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
  clinbert: "Publicly Available Clinical BERT Embeddings",
  mimic3: "MIMIC-III, a freely accessible critical care database",
  longformer: "Longformer: The Long-Document Transformer",
  bigbird: "Big Bird: Transformers for Longer Sequences",
  flash: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
  survey: "Efficient Transformers: A Survey",
  s4: "Efficiently Modeling Long Sequences with Structured State Spaces",
  mamba: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces",
  lora: "LoRA: Low-Rank Adaptation of Large Language Models",
  qlora: "QLoRA: Efficient Finetuning of Quantized LLMs",
  medpalm: "Large language models encode clinical knowledge",
  gatortron: "A large language model for electronic health records",
  vanaken: "Clinical Outcome Prediction from Admission Notes using Self-Supervised Knowledge Integration",
  caml: "Explainable Prediction of Medical Codes from Clinical Text",
  longclin: "A Comparative Study of Pretrained Language Models for Long Clinical Text",
  calib: "On Calibration of Modern Neural Networks",
  obermeyer: "Dissecting racial bias in an algorithm used to manage the health of populations",
  rope: "RoFormer: Enhanced Transformer with Rotary Position Embedding",
  lost: "Lost in the Middle: How Language Models Use Long Contexts",
  hier: "Hierarchical Transformers for Long Document Classification",
  pearl: "Causal Inference in Statistics: A Primer",
  slp: "Speech and Language Processing",
  ring: "Ring Attention with Blockwise Transformers for Near-Infinite Context",
  chinchilla: "Training Compute-Optimal Large Language Models",
  gpt3: "Language Models are Few-Shot Learners",
  bioBert: "BioBERT: a pre-trained biomedical language representation model for biomedical text mining",
};

export function NOTES({ idOf }) {
  const L = (key, label) => `[${label}](${idOf(T[key])})`;
  return [
    {
      project: T.mamba, file: "Reading notes.md", daysAfter: 2,
      content: `
# Mamba - reading notes

**TL;DR** S4 with input-dependent (selective) $\\Delta$, $B$, $C$. Loses the convolution view, so they need a hardware-aware parallel scan instead. Linear in $L$ at train time, constant memory per step at inference.

## Key ideas
- *Selection mechanism*: $B_t = s_B(x_t)$, $C_t = s_C(x_t)$, $\\Delta_t = \\tau_\\Delta(\\text{Parameter} + s_\\Delta(x_t))$
- Discretization (ZOH): $\\bar{A} = \\exp(\\Delta A)$, $\\bar{B} = (\\Delta A)^{-1}(\\exp(\\Delta A) - I)\\Delta B$
- Kernel fusion + recomputation: never materializes the $(B, L, D, N)$ state in HBM (same trick as ${L("flash", "FlashAttention")})
- Block = H3-style gated MLP with the SSM in place of attention; no separate MLP block

## Why I care (thesis Ch3)
Discharge summaries are long (median ~1.9k word pieces in our MIMIC-IV split). ${L("longformer", "Longformer")} and ${L("bigbird", "BigBird")} still cost a lot at 4k+. If selective SSMs keep up on *extraction*-style tasks (ICD coding, outcome prediction) this is a cheaper backbone.

> Concern: the synthetic **selective copying** and **induction heads** results look great, but recall-heavy tasks are where SSMs historically lag attention (see H3 paper). ICD coding is basically recall over the whole note.

## Questions for reading group
1. How sensitive is it to the init of $A$ (S4D-Real vs S4D-Lin)?
2. Any results on bidirectional / encoder use? Everything here is causal LM.
3. Is there a clean way to add a few global attention layers (hybrid)? -> Jamba, Zamba do this

## TODO
- [x] read Sec. 3.3 (hardware-aware algorithm) again
- [ ] try \`mamba-130m\` on our MIMIC-IV-Note ICD-10 top-50 split
- [ ] compare against ${L("longclin", "Clinical-Longformer")} at 4096 tokens
- [ ] ask Priya whether the lab still has A100 hours in December
`,
    },
    {
      project: T.mamba, file: "Reading group questions (Nov 13).md", daysAfter: 30,
      content: `
# Reading group - Nov 13

Presenter: me. 45 min + discussion. Slides in Drive /reading-group/2026-fall/mamba.pdf

Attendance: Priya, Jonah, Wen, Marcus, Aisha (+2 from Prof. Okafor's group)

## Discussion notes
- Jonah: the "linear time" claim is about training FLOPs; actual wall-clock depends heavily on the scan kernel. Benchmarks are on H100 only.
- Wen asked about length generalization. Fig. 4 shows extrapolation to 1M on induction heads, but nothing on real text beyond training length.
- Priya: for our use case we should check **bidirectional** variants (Caduceus does this for DNA).
- Everyone agreed the ablation on $\\Delta$ selectivity (Table 7) is the most convincing part.

## Follow-ups
- Marcus will present ${L("ring", "RingAttention")} on Dec 4
- I owe the group a short comparison table: S4 / H3 / Hyena / Mamba
`,
    },
    {
      project: T.longclin, file: "Reading notes.md", daysAfter: 1,
      content: `
# Clinical-Longformer / Clinical-BigBird (Li et al., JAMIA 2023)

Closest prior work to my Ch4. **Must cite + compare.**

## Setup
- Continued pre-training of ${L("longformer", "Longformer")} and ${L("bigbird", "BigBird")} on MIMIC-III notes, 4096 max length
- 200k steps, batch 64 (?? check appendix), lr 3e-5
- Tasks: NER (i2b2 2006/2010/2012/2014), QA (emrQA), NLI (MedNLI), classification (MIMIC-AKI, openI)

## Results I care about
| Task | ClinicalBERT | Clinical-Longformer | delta |
|---|---|---|---|
| MIMIC-AKI (AUC) | 0.749 | 0.762 | +1.3 |
| emrQA-relation (EM) | 0.928 | 0.941 | +1.3 |
| i2b2 2014 NER (F1) | 0.946 | 0.954 | +0.8 |

Gains are consistent but **small**. Not clear how much is length vs. extra pre-training compute.

## Gaps / my angle
1. No ICD coding at all, which is the task where truncation hurts most (cf. ${L("caml", "CAML")})
2. Only MIMIC-III. We have MIMIC-IV-Note now.
3. No efficiency numbers (memory / throughput). Reviewers will ask.
4. No calibration analysis -> ${L("calib", "Guo et al.")}

Checkpoints: \`yikuan8/Clinical-Longformer\` on HF hub.
`,
    },
    {
      project: T.longclin, file: "experiments/run-log.md", daysAfter: 12,
      content: `
# Run log - Clinical-Longformer baseline (MIMIC-IV ICD-10 top-50)

All runs: 4xA100 40GB, fp16, grad accum 4, eff. batch 32, early stopping on dev micro-F1.

| date | run | max_len | lr | epochs | micro-F1 | macro-F1 | P@5 | notes |
|---|---|---|---|---|---|---|---|---|
| 2026-09-02 | clf-01 | 512 | 2e-5 | 20 | 0.611 | 0.534 | 0.602 | truncation baseline |
| 2026-09-03 | clf-02 | 4096 | 2e-5 | 20 | 0.664 | 0.587 | 0.641 | OOM at bs 8, used bs 4 |
| 2026-09-05 | clf-03 | 4096 | 5e-5 | 12 | 0.671 | 0.590 | 0.648 | |
| 2026-09-09 | clf-04 | 4096 | 5e-5 | 12 | 0.402 | 0.211 | 0.398 | **diverged** - forgot warmup, ignore |
| 2026-09-10 | clf-05 | 4096 | 5e-5 | 12 | 0.673 | 0.594 | 0.650 | warmup 10%, seed 2 |
| 2026-09-18 | hier-01 | 8x512 | 3e-5 | 15 | 0.659 | 0.571 | 0.637 | ${L("hier", "hierarchical")} ClinicalBERT, max-pool |

Takeaways so far
- 4096 helps (+5-6 micro-F1) but costs ~3.1x wall-clock per epoch
- hierarchical is surprisingly close and much cheaper; need attention pooling instead of max-pool
- seed variance on macro-F1 is ~1 pt, need 3 seeds for final table
`,
    },
    {
      project: T.longformer, file: "notes.md", daysAfter: 3,
      content: `
# Longformer

- sliding window attention, window $w$ per layer (512 typical), dilated windows in upper layers for char-LM
- **global attention** on task tokens: [CLS] for classification, question tokens for QA
- separate projections $Q_g, K_g, V_g$ for global attention
- copy RoBERTa position embeddings 8x to init 4096 positions -> cheap continued pretraining

Complexity: $O(n \\cdot w)$ instead of $O(n^2)$.

Impl detail I keep forgetting: needs \`attention_window\` to be a multiple of 2 and input padded to multiple of window size.

See also ${L("bigbird", "BigBird")}, ${L("survey", "Tay survey")} Sec 3.
`,
    },
    {
      project: T.attn, file: "notes.md", daysAfter: 400,
      content: `
# Transformer - quick reference

Scaled dot-product attention:

$$\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V$$

- base: $d_{model}=512$, $h=8$, $d_k=d_v=64$, $d_{ff}=2048$, $N=6$
- sinusoidal PE (later replaced by learned / ${L("rope", "RoPE")} / ALiBi)
- post-LN in the original; pre-LN is what everyone uses now
- label smoothing 0.1, warmup 4000 steps, inverse sqrt decay

For TA section: good figure for explaining multi-head attention is Fig. 2.
`,
    },
    {
      project: T.flash, file: "notes.md", daysAfter: 5,
      content: `
# FlashAttention

Core point: attention is **memory-bound**, not compute-bound. Count HBM reads/writes, not FLOPs.

- tile Q, K, V into blocks that fit in SRAM
- online softmax (keep running max $m$ and normalizer $\\ell$ per row)
- backward: recompute attention from Q,K,V blocks + saved $(m, \\ell)$ instead of storing $n \\times n$ matrix

HBM accesses: $\\Theta(N^2 d^2 M^{-1})$ vs $\\Theta(Nd + N^2)$ for standard.

Practical: \`attn_implementation="flash_attention_2"\` in HF. Works with Longformer? **No** - sliding window needs custom kernel. Mistral-style SWA is supported though.
`,
    },
    {
      project: T.caml, file: "baseline reproduction.md", daysAfter: 20,
      content: `
# CAML reproduction

Using the \`caml-mimic\` repo (py2 originally...). Ported to py3.10, torch 2.1.

- MIMIC-III full (8,922 codes): micro-F1 0.536 (paper 0.539) - ok
- MIMIC-III top-50: micro-F1 0.612 (paper 0.614) - ok
- MIMIC-IV ICD-10 top-50: 0.589 - new number for our table

Word embeddings: word2vec trained on MIMIC notes, dim 100. Took 40 min on CPU.

Note: label-wise attention is the thing that makes it interpretable; see Fig. 3 in the paper. Want the same visualization for my model in Ch5.
`,
    },
    {
      project: T.calib, file: "notes.md", daysAfter: 2,
      content: `
# Calibration

ECE with 15 bins. Temperature scaling = single scalar $T$ fit on validation NLL.

For multi-label ICD coding, calibrate **per label**? Too few positives for tail codes. Options:
- global temperature across labels
- Platt per frequent label, global for tail
- check reliability diagrams for top-10 codes separately

Relevant to deployment discussion (Ch5): clinicians will see probabilities, not just predicted codes.
`,
    },
    {
      project: T.obermeyer, file: "notes.md", daysAfter: 4,
      content: `
# Obermeyer et al. 2019

Label choice bias: algorithm predicts **cost** as proxy for **need**. Black patients at same risk score were considerably sicker (more chronic conditions), because less money is spent on them at equal need.

Fix: retrain on direct health measures -> fraction of Black patients auto-enrolled went from 17.7% to 46.5%.

For Ch5 fairness section: ICD codes themselves are a proxy (billing), not ground-truth diagnoses. Same family of issue.
`,
    },
    {
      project: T.lost, file: "notes.md", daysAfter: 1,
      content: `
# Lost in the Middle

U-shaped curve: accuracy best when the relevant doc is first or last, worst in the middle. Even for models advertised with long contexts.

Experiments
- multi-doc QA (NaturalQuestions-Open), 10/20/30 docs, gold doc position varied
- synthetic key-value retrieval (JSON), 75/140/300 pairs

Implication for us: when we feed the full discharge summary, are codes mentioned mid-note (e.g. *Hospital Course*) under-detected? -> **position analysis by section** for Ch4. Sections: Chief Complaint, HPI, PMH, Hospital Course, Discharge Diagnosis, Discharge Meds.

${L("medpalm", "Med-PaLM")} doesn't look at this at all.
`,
    },
    {
      project: T.lora, file: "notes.md", daysAfter: 2,
      content: `
# LoRA

$W = W_0 + BA$, $B \\in \\mathbb{R}^{d \\times r}$, $A \\in \\mathbb{R}^{r \\times k}$, $r \\ll \\min(d,k)$. Init $B=0$ so training starts at $W_0$. Scale by $\\alpha / r$.

- applied to $W_q, W_v$ only in the paper; most people now do all linear layers
- r=8 often enough; r=1 surprisingly ok for GPT-3

Used in my Ch4 for the 7B baselines (with ${L("qlora", "QLoRA")} for the 13B one).
`,
    },
    {
      project: T.medpalm, file: "notes.md", daysAfter: 3,
      content: `
# Med-PaLM (Singhal et al., Nature 2023)

MultiMedQA = MedQA (USMLE), MedMCQA, PubMedQA, MMLU clinical topics, LiveQA, MedicationQA + new HealthSearchQA.

Flan-PaLM 540B: 67.6% on MedQA. Instruction prompt tuning -> Med-PaLM, evaluated by clinicians on 12 axes.

Mostly QA; nothing on long EHR documents. Relevant only for the "why not just prompt an LLM" paragraph in my intro.

Reading group 2026-10-30: Aisha pointed out the human eval panel was small (9 clinicians, all from US/UK/India).
`,
    },
    {
      project: T.s4, file: "notes.md", daysAfter: 6,
      content: `
# S4

Continuous-time SSM: $x'(t) = Ax(t) + Bu(t)$, $y(t) = Cx(t) + Du(t)$

HiPPO init for $A$ -> memorizes history via Legendre projection. Naive computation of the SSM convolution kernel $\\bar{K}$ is too slow; NPLR (normal plus low-rank) decomposition + Cauchy kernel makes it $\\tilde{O}(N + L)$.

First model to solve Path-X (16k length) in LRA.

Successors: S4D (diagonal), S5, H3, Hyena, ${L("mamba", "Mamba")}.
`,
    },
    {
      project: T.pearl, file: "ch3 exercises.md", daysAfter: 30,
      content: `
# Primer - Ch 3 study notes

Backdoor criterion: a set $Z$ satisfies it relative to $(X, Y)$ if no node in $Z$ is a descendant of $X$, and $Z$ blocks every path between $X$ and $Y$ that contains an arrow into $X$.

Adjustment formula: $P(y \\mid do(x)) = \\sum_z P(y \\mid x, z) P(z)$

Study problem 3.3.1 - worked through with Wen, our answers differ on (c). Ask in office hours.

Relevance: the "does longer context *cause* better coding or is it confounded by note type" question for Ch5.
`,
    },
    {
      project: T.slp, file: "TA - week 7 section plan.md", daysAfter: 60,
      content: `
# CSE 256 section - week 7 (transformers)

Room: CSE 1202, Thu 4-4:50pm

1. (10 min) recap attention from lecture; draw Q/K/V on board
2. (15 min) worked example: 3-token self-attention by hand, $d_k = 2$
3. (15 min) notebook: \`bertviz\` on a sentence with coreference
4. (10 min) PA3 questions

Reading: SLP3 ch. 9 + ${L("attn", "Vaswani et al.")} sec. 3

Common confusion last year: why divide by $\\sqrt{d_k}$. Have the variance argument ready.
`,
    },
    {
      project: T.mimic3, file: "data access + cleaning.md", daysAfter: 10,
      content: `
# MIMIC data notes

- PhysioNet credentialing renewed 2026-03-14 (CITI training cert expires 2029)
- NOTEEVENTS: 2,083,180 rows; 59,652 discharge summaries
- filter \`ISERROR\` = 1 rows (886)
- addenda: concatenate to the parent summary by HADM_ID, keep chronological order

Preprocessing pipeline lives in \`thesis-code/data/mimic3_prep.py\`

Known issues
- de-id placeholders like \`[**Hospital 1234**]\`, normalize to \`[HOSPITAL]\`
- some notes have duplicated sections (copy-forward); dedupe at paragraph level? -> discussed w/ Priya, decided **not** to dedupe for main experiments, but report it
`,
    },
    {
      project: T.hier, file: "notes.md", daysAfter: 4,
      content: `
# Hierarchical transformers (Pappagari et al.)

Segment doc into 200-token chunks w/ 50 overlap -> BERT per chunk -> [CLS] vectors -> LSTM or 1-layer transformer -> classifier.

RoBERT / ToBERT naming. Cheap and strong baseline; my hier-01 run in ${L("longclin", "Clinical-Longformer")} run log uses this.
`,
    },
    {
      project: T.vanaken, file: "notes.md", daysAfter: 2,
      content: `
# Clinical outcome prediction (van Aken et al., EACL 2021)

Admission notes only (simulating info available at admission): filter discharge summary to sections Chief Complaint, HPI, Medical History, Admission Meds, Allergies, Physical Exam, Family/Social History.

Tasks: diagnoses (ICD-9 3-digit), procedures, in-hospital mortality, length-of-stay buckets.

Their CORe pretraining: +1-2 AUROC over BioBERT. Their **task definitions are what I'm adopting** for the outcome part of Ch4 - cite clearly.
`,
    },
    {
      project: T.chinchilla, file: "notes.md", daysAfter: 1,
      content: `
# Chinchilla

~20 tokens per parameter. Approaches 1-3 all roughly agree $N_{opt} \\propto C^{0.5}$, $D_{opt} \\propto C^{0.5}$.

vs ${L("gpt3", "GPT-3")}: 175B params / 300B tokens = way undertrained by this rule.
`,
    },
    {
      project: T.ring, file: "notes.md", daysAfter: 1,
      content: `
# RingAttention

Marcus presenting Dec 4. Skimmed only.

- blockwise parallel transformer + ring topology for passing KV blocks
- context length scales with #devices
`,
    },

    {
      project: T.bigbird, file: "notes.md", daysAfter: 2,
      content: `
# BigBird

random (r) + window (w) + global (g) attention. ITC vs ETC variants (internal vs extra global tokens).

Theory part (universal approximation, Turing completeness) - skimmed, not needed for thesis.

Clinical-BigBird in ${L("longclin", "Clinical-Longformer")} paper was slightly *worse* than Longformer on most tasks.
`,
    },
    {
      project: T.survey, file: "taxonomy.md", daysAfter: 15,
      content: `
# Efficient transformer taxonomy (Tay et al.)

- **fixed patterns**: blockwise, strided, local window -> ${L("longformer", "Longformer")} (partly)
- **combination of patterns**: ${L("bigbird", "BigBird")}, Axial
- **learnable patterns**: Reformer (LSH), Routing Transformer
- **memory / global tokens**: Set Transformer, ETC, Longformer global attn
- **low rank**: Linformer
- **kernels**: Performer, Linear Transformer
- **recurrence**: Transformer-XL, Compressive

Missing (post-survey): SSMs (${L("s4", "S4")}, ${L("mamba", "Mamba")}), IO-aware exact attention (${L("flash", "FlashAttention")}).

Use this as the skeleton for **Ch2 Sec 2.3**.
`,
    },
    {
      project: T.clinbert, file: "notes.md", daysAfter: 400,
      content: `
# ClinicalBERT (Alsentzer et al.)

Bio+Clinical BERT = BioBERT init + MIMIC notes. Discharge-summary-only variant.

Not helpful on de-id (i2b2 2006/2014) - de-id text has PHI replaced, distribution shift.

HF: \`emilyalsentzer/Bio_ClinicalBERT\` - my default short-context baseline.
`,
    },
    {
      project: T.gatortron, file: "notes.md", daysAfter: 3,
      content: `
# GatorTron

UF Health notes, 82B words clinical + PubMed + Wikipedia. 345M / 3.9B / 8.9B params. Megatron-BERT.

Weights for 345M public on NGC. Max length 512 (!!) - still short context.
`,
    },
    {
      project: T.rope, file: "notes.md", daysAfter: 2,
      content: `
# RoPE

Rotate pairs of dims of $q$, $k$ by angle $m\\theta_i$, $\\theta_i = 10000^{-2i/d}$. Inner product then depends only on $m - n$.

Context extension tricks built on top: position interpolation, NTK-aware scaling, YaRN. Relevant if I extend a 2k-context decoder to 8k for discharge summaries.
`,
    },
    {
      project: T.qlora, file: "setup notes.md", daysAfter: 1,
      content: `
# QLoRA setup on lab server

\`\`\`bash
pip install bitsandbytes==0.43.1 peft==0.11.1 transformers==4.41.2
\`\`\`

- \`bnb_4bit_quant_type="nf4"\`, \`bnb_4bit_compute_dtype=torch.bfloat16\`, double quant on
- r=16, alpha=32, dropout 0.05, all linear layers
- 13B fits on one A100 40GB with seq len 4096 + grad checkpointing, ~1.9 it/s

Gotcha: paged_adamw_8bit crashed with deepspeed zero-3, use plain DDP.
`,
    },
    {
      project: T.pearl, file: "do-calculus cheat sheet.md", daysAfter: 45,
      content: `
# do-calculus rules

1. insertion/deletion of observations
2. action/observation exchange
3. insertion/deletion of actions

Front-door adjustment: $P(y \\mid do(x)) = \\sum_m P(m \\mid x) \\sum_{x'} P(y \\mid m, x') P(x')$
`,
    },
    {
      project: T.gpt3, file: "notes.md", daysAfter: 500,
      content: `
# GPT-3

175B, 96 layers, $d_{model}$ = 12288, 2048 ctx. Few-shot via in-context examples.

For intro: the "just prompt it" baseline. Medical coding few-shot is terrible though (thousands of labels).
`,
    },
    {
      project: T.bioBert, file: "notes.md", daysAfter: 380,
      content: `
# BioBERT

Init from BERT-base, + PubMed 4.5B words + PMC 13.5B words. v1.1 is the one everyone uses.
`,
    },
    {
      project: T.medpalm, file: "reading group - Oct 30.md", daysAfter: 20,
      content: `
# Reading group Oct 30 - Med-PaLM

Presenter: Aisha

- discussion mostly about evaluation: is USMLE-style QA meaningful for deployment?
- Jonah: HealthSearchQA questions are consumer-facing, very different from clinician queries
- consensus: interesting, not directly relevant for EHR document tasks

Next: ${L("mamba", "Mamba")} (me, Nov 13)
`,
    },
  ];
}

// ---------- Excalidraw ----------
let n = 1;
function el(type, x, y, w, h, extra = {}) {
  const id = `el${n++}x${(n * 7919).toString(36)}`;
  return {
    id, type, x, y, width: w, height: h, angle: 0,
    strokeColor: "#e9ecef", backgroundColor: "transparent", fillStyle: "solid",
    strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100,
    groupIds: [], frameId: null, roundness: type === "rectangle" ? { type: 3 } : null,
    seed: 1000 + n * 37, version: 12, versionNonce: 5000 + n * 13, isDeleted: false,
    boundElements: null, updated: 1730000000000 + n * 1000, link: null, locked: false,
    ...extra,
  };
}
function text(x, y, s, size = 20, extra = {}) {
  const lines = s.split("\n");
  return el("text", x, y, Math.max(...lines.map((l) => l.length)) * size * 0.55, lines.length * size * 1.25, {
    text: s, originalText: s, fontSize: size, fontFamily: 1, textAlign: "left", verticalAlign: "top",
    baseline: size - 2, containerId: null, lineHeight: 1.25, ...extra,
  });
}
function box(x, y, w, h, label, color = "#a5d8ff") {
  return [
    el("rectangle", x, y, w, h, { strokeColor: color }),
    text(x + 14, y + h / 2 - 12, label, 18, { strokeColor: color }),
  ];
}
function arrow(x1, y1, x2, y2) {
  return el("arrow", x1, y1, x2 - x1, y2 - y1, {
    points: [[0, 0], [x2 - x1, y2 - y1]], lastCommittedPoint: null,
    startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: "arrow", roundness: { type: 2 },
  });
}
function scene(elements) {
  return {
    type: "excalidraw", version: 2, source: "https://excalidraw.com",
    elements,
    appState: { gridSize: null, viewBackgroundColor: "#121212" },
    files: {},
  };
}

export function EXCALIDRAWS() {
  return [
    {
      project: T.mamba, file: "selective scan diagram.excalidraw",
      data: scene([
        text(40, 20, "Mamba block (my sketch)", 28, { strokeColor: "#ffd43b" }),
        ...box(60, 100, 160, 60, "x (B, L, D)"),
        arrow(220, 130, 300, 90), arrow(220, 130, 300, 190),
        ...box(300, 60, 180, 60, "Linear -> Conv1d"),
        ...box(300, 170, 150, 60, "Linear (gate)", "#b2f2bb"),
        arrow(480, 90, 560, 90),
        ...box(560, 60, 200, 60, "Selective SSM", "#ffc9c9"),
        text(560, 130, "Delta, B, C = f(x_t)\nA fixed, diagonal", 16, { strokeColor: "#ffc9c9" }),
        arrow(760, 90, 840, 140), arrow(450, 200, 840, 150),
        ...box(840, 115, 100, 60, "  x  "),
        arrow(940, 145, 1010, 145),
        ...box(1010, 115, 120, 60, "Linear"),
        text(60, 280, "no attention, no MLP block\nscan is fused in SRAM (like FlashAttention)", 18, { strokeColor: "#868e96" }),
      ]),
    },
    {
      project: T.longclin, file: "thesis ch4 pipeline.excalidraw",
      data: scene([
        text(40, 20, "Ch4 experimental pipeline", 28, { strokeColor: "#ffd43b" }),
        ...box(40, 100, 210, 60, "MIMIC-IV-Note"),
        arrow(250, 130, 320, 130),
        ...box(320, 100, 220, 60, "section split + de-id norm"),
        arrow(540, 130, 610, 130),
        ...box(610, 100, 170, 60, "ICD-10 top-50", "#b2f2bb"),
        arrow(695, 160, 695, 230),
        ...box(470, 230, 140, 56, "512 trunc", "#ffc9c9"),
        ...box(630, 230, 150, 56, "Longformer 4k", "#ffc9c9"),
        ...box(800, 230, 140, 56, "Hier-BERT", "#ffc9c9"),
        ...box(960, 230, 130, 56, "Mamba ?", "#ffec99"),
        arrow(695, 286, 695, 350),
        ...box(560, 350, 290, 60, "micro/macro-F1, P@5, ECE"),
        text(40, 450, "+ position analysis by section (Lost in the Middle)\n+ throughput / peak memory table", 18, { strokeColor: "#868e96" }),
      ]),
    },
    {
      project: T.attn, file: "attention whiteboard.excalidraw",
      data: scene([
        text(40, 30, "Self-attention, 3 tokens (section wk 7)", 26, { strokeColor: "#ffd43b" }),
        ...box(40, 110, 110, 50, " the "), ...box(40, 180, 110, 50, " cat "), ...box(40, 250, 110, 50, " sat "),
        arrow(150, 205, 260, 205),
        text(270, 160, "q = xW_Q\nk = xW_K\nv = xW_V", 20),
        arrow(420, 205, 520, 205),
        text(530, 150, "softmax(q k^T / sqrt(d_k))", 20, { strokeColor: "#ffc9c9" }),
        text(530, 200, "[0.12 0.71 0.17]", 22, { strokeColor: "#b2f2bb" }),
        text(530, 260, "-> weighted sum of v", 20),
      ]),
    },
  ];
}

// comments on highlighted passages ("" = plain highlight)
export const ANNOTATION_COMMENTS = {
  [T.mamba]: ["selection = input-dependent Delta, B, C", "", "compare w/ H3 gating", "", "why no bidirectional results?", ""],
  [T.longclin]: ["closest prior work", "", "only MIMIC-III", "no efficiency numbers - reviewers will ask", "", "check: 4096 max len"],
  [T.lost]: ["U-shape", "", "do this per note section"],
  [T.longformer]: ["", "global attn on CLS", ""],
  [T.flash]: ["memory-bound, not compute-bound", ""],
  [T.attn]: ["", "sqrt(d_k) variance argument"],
  [T.caml]: ["label-wise attention", ""],
  [T.obermeyer]: ["cost as proxy for need", "", "ICD codes are also proxies"],
  [T.clinbert]: ["", "no gain on de-id"],
  [T.vanaken]: ["admission sections used", ""],
  [T.calib]: ["temperature scaling", ""],
  [T.medpalm]: ["", "small clinician panel"],
};
