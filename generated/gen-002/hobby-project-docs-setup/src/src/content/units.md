---
title: :Units
description: Convert between the units used for amount, mass, and volume.
---

# :Units

Converts a value between units that show up in chemistry calculations.

## Synopsis

```vim
:Units {value} {from} {to}
```

## Examples

```vim
:Units 2.5 mol mmol
:Units 18.02 g/mol kg/mol
```

```text
2.5 mol = 2500 mmol
18.02 g/mol = 0.01802 kg/mol
```

## Molar mass

Molar mass is the mass of one mole of a substance. elemental.nvim reports it in g/mol by default. The SI unit is kg/mol. Numerically, 1 g/mol equals 1 u, which is why [:ElementMass](ref:element-mass) can report either unit.

## Supported units

| Kind | Units |
| --- | --- |
| Amount | `mol`, `mmol`, `µmol` |
| Mass | `kg`, `g`, `mg` |
| Molar mass | `kg/mol`, `g/mol` |
| Volume | `L`, `mL` |
