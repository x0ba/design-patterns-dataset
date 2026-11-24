---
title: :ElementLookup
description: Open a floating window with the properties of one element.
---

# :ElementLookup

Opens a floating window with the properties of one element.

## Synopsis

```vim
:ElementLookup [{symbol|name|atomic-number}]
```

## Arguments

- **symbol**: the chemical symbol, such as `Na`. Case does not matter, so `na` also works.
- **name**: the element name, such as `sodium`.
- **atomic-number**: an integer from 1 to 118.

With no argument, the word under the cursor is used.

## Examples

```vim
:ElementLookup Fe
:ElementLookup 79
:ElementLookup tungsten
```

## See also

- [:ElementCompare](ref:element-compare)
- [:ElectronConfig](ref:electron-config)
