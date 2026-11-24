# Callouts

Callouts are highlighted boxes for notes, tips, warnings, and cautions. Write one as a block that opens and closes with three colons:

```
:::note
Neovim 0.9 or newer is required.
:::
```

The type after the opening colons sets the style: `note`, `tip`, `warning`, or `caution`.

A blockquote is different. A line that starts with `>` is ordinary Markdown, so `> NOTE: ...` shows up as a plain quote with the word NOTE in it. Quillstack flags that as a **notice** and offers to convert it to a callout block in one click.
