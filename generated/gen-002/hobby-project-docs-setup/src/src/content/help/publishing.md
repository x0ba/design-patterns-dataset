# Publishing

Publishing builds every page, checks every cross-reference, and uploads the result to your base URL plus the version folder.

Publish is available when both of these are true:

1. **No errors.** Broken references block publishing. Warnings and notices don't.
2. **A base URL is set.** It must start with `https://` and end with `/`.

Publishing overwrites the version folder it targets. The Changelog and older version folders are not touched.
