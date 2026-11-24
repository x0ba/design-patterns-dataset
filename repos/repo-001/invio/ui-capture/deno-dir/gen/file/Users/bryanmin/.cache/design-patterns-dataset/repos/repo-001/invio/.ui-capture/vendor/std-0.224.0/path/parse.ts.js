// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { isWindows } from "./_os.ts";
import { parse as posixParse } from "./posix/parse.ts";
import { parse as windowsParse } from "./windows/parse.ts";
/**
 * Return a `ParsedPath` object of the `path`. Use `format` to reverse the result.
 *
 * @example
 * ```ts
 * import { parse } from "https://deno.land/std@$STD_VERSION/path/mod.ts";
 *
 * const parsedPathObj = parse("/path/to/dir/script.ts");
 * parsedPathObj.root; // "/"
 * parsedPathObj.dir; // "/path/to/dir"
 * parsedPathObj.base; // "script.ts"
 * parsedPathObj.ext; // ".ts"
 * parsedPathObj.name; // "script"
 * ```
 * @param path to process
 */ export function parse(path) {
  return isWindows ? windowsParse(path) : posixParse(path);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjQuMC9wYXRoL3BhcnNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmltcG9ydCB7IGlzV2luZG93cyB9IGZyb20gXCIuL19vcy50c1wiO1xuaW1wb3J0IHR5cGUgeyBQYXJzZWRQYXRoIH0gZnJvbSBcIi4vX2ludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgcGFyc2UgYXMgcG9zaXhQYXJzZSB9IGZyb20gXCIuL3Bvc2l4L3BhcnNlLnRzXCI7XG5pbXBvcnQgeyBwYXJzZSBhcyB3aW5kb3dzUGFyc2UgfSBmcm9tIFwiLi93aW5kb3dzL3BhcnNlLnRzXCI7XG5cbmV4cG9ydCB0eXBlIHsgUGFyc2VkUGF0aCB9IGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcblxuLyoqXG4gKiBSZXR1cm4gYSBgUGFyc2VkUGF0aGAgb2JqZWN0IG9mIHRoZSBgcGF0aGAuIFVzZSBgZm9ybWF0YCB0byByZXZlcnNlIHRoZSByZXN1bHQuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBwYXJzZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL3BhdGgvbW9kLnRzXCI7XG4gKlxuICogY29uc3QgcGFyc2VkUGF0aE9iaiA9IHBhcnNlKFwiL3BhdGgvdG8vZGlyL3NjcmlwdC50c1wiKTtcbiAqIHBhcnNlZFBhdGhPYmoucm9vdDsgLy8gXCIvXCJcbiAqIHBhcnNlZFBhdGhPYmouZGlyOyAvLyBcIi9wYXRoL3RvL2RpclwiXG4gKiBwYXJzZWRQYXRoT2JqLmJhc2U7IC8vIFwic2NyaXB0LnRzXCJcbiAqIHBhcnNlZFBhdGhPYmouZXh0OyAvLyBcIi50c1wiXG4gKiBwYXJzZWRQYXRoT2JqLm5hbWU7IC8vIFwic2NyaXB0XCJcbiAqIGBgYFxuICogQHBhcmFtIHBhdGggdG8gcHJvY2Vzc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2UocGF0aDogc3RyaW5nKTogUGFyc2VkUGF0aCB7XG4gIHJldHVybiBpc1dpbmRvd3MgPyB3aW5kb3dzUGFyc2UocGF0aCkgOiBwb3NpeFBhcnNlKHBhdGgpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckMsU0FBUyxTQUFTLFFBQVEsV0FBVztBQUVyQyxTQUFTLFNBQVMsVUFBVSxRQUFRLG1CQUFtQjtBQUN2RCxTQUFTLFNBQVMsWUFBWSxRQUFRLHFCQUFxQjtBQUkzRDs7Ozs7Ozs7Ozs7Ozs7O0NBZUMsR0FDRCxPQUFPLFNBQVMsTUFBTSxJQUFZO0VBQ2hDLE9BQU8sWUFBWSxhQUFhLFFBQVEsV0FBVztBQUNyRCJ9
// denoCacheMetadata=10602482556283865624,18206004071726169477