---
title: Quick Start
description: Look up an element and compute a molar mass in under a minute.
---

# Quick Start

Once the plugin is installed, the commands work from any buffer.

## Look up an element

Move the cursor onto a symbol such as `Fe` and run:

```vim
:ElementLookup
```

A floating window opens with the atomic number, standard atomic weight, group, period, and category. See [:ElementLookup](ref:element-lookup) for every argument form.

## Compute a molar mass

```vim
:ElementMass H2SO4
```

```text
H2SO4  98.07 g/mol
```

## Next steps

The defaults suit most people. To change the border, the precision, or the key mappings, follow [Configuration options](ref:config-options).
