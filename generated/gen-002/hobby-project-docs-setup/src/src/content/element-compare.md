---
title: :ElementCompare
description: Show two elements side by side for quick comparison.
---

# :ElementCompare

Shows two elements side by side in one window.

## Synopsis

```vim
:ElementCompare {a} {b}
```

## Arguments

- **a**, **b**: any value accepted by [:ElementLookup](ref:element-lookup).

## Example

```vim
:ElementCompare Na K
```

The window lines the two elements up row by row, so differences in electronegativity or period are easy to spot. A row with no data for either element shows `—`.

## See also

- [:ElectronConfig](ref:electron-config)
