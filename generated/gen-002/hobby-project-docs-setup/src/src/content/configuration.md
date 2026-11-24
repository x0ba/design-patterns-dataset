---
title: Configuration
description: Every option accepted by setup(), with its default and what it changes.
---

# Configuration

## Configuration options

Pass a table to `setup()`, or to `opts` in your plugin manager. Anything you leave out keeps its default.

| Option | Default | What it controls |
| --- | --- | --- |
| `precision` | `2` | Decimal places in mass results. |
| `float_border` | `"rounded"` | Border style of lookup windows. Any value accepted by `nvim_open_win`. |
| `mass_unit` | `"g/mol"` | Unit for molar mass results. `"kg/mol"` and `"u"` are also accepted. |
| `show_isotope_mass` | `false` | Adds the mass number to element lookups. |
| `mappings` | `true` | Set to `false` to turn off the default `<leader>E` key mappings. |

Example:

```lua
require("elemental").setup({
  precision = 3,
  float_border = "single",
})
```
