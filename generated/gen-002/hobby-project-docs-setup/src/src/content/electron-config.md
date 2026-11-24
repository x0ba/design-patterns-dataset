---
title: :ElectronConfig
description: Show the ground-state electron configuration of an element.
---

# :ElectronConfig

Shows the ground-state electron configuration of one element, in noble-gas shorthand.

## Synopsis

```vim
:ElectronConfig {symbol}
```

## Example

```vim
:ElectronConfig S
```

```text
S  [Ne] 3s² 3p⁴
```

## Notes

- Configurations follow the Aufbau order. Known exceptions, such as chromium and copper, are included.
- Ions are not supported yet. Pass the neutral element.

## See also

- [:ElementLookup](ref:element-lookup)
