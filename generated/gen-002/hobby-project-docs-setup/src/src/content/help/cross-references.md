# Cross-references

Link to another part of your docs with `[text](ref:target)`. The target can be:

- a **page** name, such as `ref:install`
- a **section** id, such as `ref:lazy-nvim`
- a **page and section**, written `page#section`, such as `ref:units#molar-mass`

Section ids come from headings. Quillstack lowercases the heading, drops punctuation, and turns spaces into hyphens. So `## Molar mass` gets the id `molar-mass`, and `## Configuration options` gets `configuration-options`.

A reference breaks when its target is renamed or deleted. Quillstack reports it as an **error** and blocks publishing until it's fixed. The build report suggests a replacement when it finds a close match, and you can also pick any section from the list.
