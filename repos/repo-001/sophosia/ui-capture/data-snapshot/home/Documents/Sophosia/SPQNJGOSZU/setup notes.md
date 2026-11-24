# QLoRA setup on lab server

```bash
pip install bitsandbytes==0.43.1 peft==0.11.1 transformers==4.41.2
```

- `bnb_4bit_quant_type="nf4"`, `bnb_4bit_compute_dtype=torch.bfloat16`, double quant on
- r=16, alpha=32, dropout 0.05, all linear layers
- 13B fits on one A100 40GB with seq len 4096 + grad checkpointing, ~1.9 it/s

Gotcha: paged_adamw_8bit crashed with deepspeed zero-3, use plain DDP.
