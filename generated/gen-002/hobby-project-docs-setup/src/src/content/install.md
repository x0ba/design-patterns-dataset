---
title: Install
description: Install elemental.nvim with lazy.nvim, packer.nvim, or vim-plug.
---

# Install

elemental.nvim adds periodic-table lookups to Neovim. It has no dependencies beyond Neovim itself.

> NOTE: Neovim 0.9 or newer is required. Run `nvim --version` to check which version you have.

## lazy.nvim

Add the plugin to your plugin spec:

```lua
{
  "hale-chem/elemental.nvim",
  opts = {},
}
```

## packer.nvim

```lua
use {
  "hale-chem/elemental.nvim",
  config = function()
    require("elemental").setup()
  end,
}
```

## vim-plug

```vim
Plug 'hale-chem/elemental.nvim'
```

Then run `:PlugInstall` and restart Neovim.

When the install is working, continue to [Quick Start](ref:quick-start).
