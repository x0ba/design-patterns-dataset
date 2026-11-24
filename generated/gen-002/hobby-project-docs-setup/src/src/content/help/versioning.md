# Versioning

The **version** setting labels this set of docs. It doesn't read your plugin's version, and it doesn't change the Changelog. It does three things:

- It appears in the site header, as "elemental.nvim 0.9 docs".
- It sets the publish folder. Pages go to your base URL plus the version, such as `…/elemental.nvim/0.9/`.
- It lets older doc sets stay online. When you publish a `0.10` set, `0.9` stays at its own address.

Your latest release is 0.9.2. That's a patch on the 0.9 line, so the docs stay at `0.9`. Change the version when you start documenting a new minor release, such as 0.10.
