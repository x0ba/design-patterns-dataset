---
title: :ElementMass
description: Compute the molar mass of a chemical formula.
---

# :ElementMass

Computes the molar mass of a formula from standard atomic weights.

## Synopsis

```vim
:ElementMass {formula}
```

## Arguments

- **formula**: a chemical formula. Parentheses and hydrates work: `Ca(OH)2` and `CuSO4·5H2O` are both valid.

Results use the `mass_unit` and `precision` options. Molar masses are reported in g/mol by default. For conversions, see [molar mass units](ref:units#molar).

## Examples

```vim
:ElementMass H2O
:ElementMass Ca(OH)2
```

```text
H2O      18.02 g/mol
Ca(OH)2  74.09 g/mol
```

## See also

- [:Units](ref:units)
