// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { assert } from "../../assert/assert.ts";
import { assertPath } from "../_common/assert_path.ts";
import { isPathSeparator } from "./_util.ts";
import { normalize } from "./normalize.ts";
/**
 * Join all given a sequence of `paths`,then normalizes the resulting path.
 * @param paths to be joined and normalized
 */ export function join(...paths) {
  if (paths.length === 0) return ".";
  let joined;
  let firstPart = null;
  for(let i = 0; i < paths.length; ++i){
    const path = paths[i];
    assertPath(path);
    if (path.length > 0) {
      if (joined === undefined) joined = firstPart = path;
      else joined += `\\${path}`;
    }
  }
  if (joined === undefined) return ".";
  // Make sure that the joined path doesn't start with two slashes, because
  // normalize() will mistake it for an UNC path then.
  //
  // This step is skipped when it is very clear that the user actually
  // intended to point at an UNC path. This is assumed when the first
  // non-empty string arguments starts with exactly two slashes followed by
  // at least one more non-slash character.
  //
  // Note that for normalize() to treat a path as an UNC path it needs to
  // have at least 2 components, so we don't filter for that here.
  // This means that the user can use join to construct UNC paths from
  // a server name and a share name; for example:
  //   path.join('//server', 'share') -> '\\\\server\\share\\')
  let needsReplace = true;
  let slashCount = 0;
  assert(firstPart !== null);
  if (isPathSeparator(firstPart.charCodeAt(0))) {
    ++slashCount;
    const firstLen = firstPart.length;
    if (firstLen > 1) {
      if (isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
          else {
            // We matched a UNC path in the first part
            needsReplace = false;
          }
        }
      }
    }
  }
  if (needsReplace) {
    // Find any more consecutive slashes we need to replace
    for(; slashCount < joined.length; ++slashCount){
      if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
    }
    // Replace the slashes if needed
    if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
  }
  return normalize(joined);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjQuMC9wYXRoL3dpbmRvd3Mvam9pbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiLi4vLi4vYXNzZXJ0L2Fzc2VydC50c1wiO1xuaW1wb3J0IHsgYXNzZXJ0UGF0aCB9IGZyb20gXCIuLi9fY29tbW9uL2Fzc2VydF9wYXRoLnRzXCI7XG5pbXBvcnQgeyBpc1BhdGhTZXBhcmF0b3IgfSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuaW1wb3J0IHsgbm9ybWFsaXplIH0gZnJvbSBcIi4vbm9ybWFsaXplLnRzXCI7XG5cbi8qKlxuICogSm9pbiBhbGwgZ2l2ZW4gYSBzZXF1ZW5jZSBvZiBgcGF0aHNgLHRoZW4gbm9ybWFsaXplcyB0aGUgcmVzdWx0aW5nIHBhdGguXG4gKiBAcGFyYW0gcGF0aHMgdG8gYmUgam9pbmVkIGFuZCBub3JtYWxpemVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luKC4uLnBhdGhzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGlmIChwYXRocy5sZW5ndGggPT09IDApIHJldHVybiBcIi5cIjtcblxuICBsZXQgam9pbmVkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBmaXJzdFBhcnQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdGhzLmxlbmd0aDsgKytpKSB7XG4gICAgY29uc3QgcGF0aCA9IHBhdGhzW2ldITtcbiAgICBhc3NlcnRQYXRoKHBhdGgpO1xuICAgIGlmIChwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChqb2luZWQgPT09IHVuZGVmaW5lZCkgam9pbmVkID0gZmlyc3RQYXJ0ID0gcGF0aDtcbiAgICAgIGVsc2Ugam9pbmVkICs9IGBcXFxcJHtwYXRofWA7XG4gICAgfVxuICB9XG5cbiAgaWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gXCIuXCI7XG5cbiAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIGpvaW5lZCBwYXRoIGRvZXNuJ3Qgc3RhcnQgd2l0aCB0d28gc2xhc2hlcywgYmVjYXVzZVxuICAvLyBub3JtYWxpemUoKSB3aWxsIG1pc3Rha2UgaXQgZm9yIGFuIFVOQyBwYXRoIHRoZW4uXG4gIC8vXG4gIC8vIFRoaXMgc3RlcCBpcyBza2lwcGVkIHdoZW4gaXQgaXMgdmVyeSBjbGVhciB0aGF0IHRoZSB1c2VyIGFjdHVhbGx5XG4gIC8vIGludGVuZGVkIHRvIHBvaW50IGF0IGFuIFVOQyBwYXRoLiBUaGlzIGlzIGFzc3VtZWQgd2hlbiB0aGUgZmlyc3RcbiAgLy8gbm9uLWVtcHR5IHN0cmluZyBhcmd1bWVudHMgc3RhcnRzIHdpdGggZXhhY3RseSB0d28gc2xhc2hlcyBmb2xsb3dlZCBieVxuICAvLyBhdCBsZWFzdCBvbmUgbW9yZSBub24tc2xhc2ggY2hhcmFjdGVyLlxuICAvL1xuICAvLyBOb3RlIHRoYXQgZm9yIG5vcm1hbGl6ZSgpIHRvIHRyZWF0IGEgcGF0aCBhcyBhbiBVTkMgcGF0aCBpdCBuZWVkcyB0b1xuICAvLyBoYXZlIGF0IGxlYXN0IDIgY29tcG9uZW50cywgc28gd2UgZG9uJ3QgZmlsdGVyIGZvciB0aGF0IGhlcmUuXG4gIC8vIFRoaXMgbWVhbnMgdGhhdCB0aGUgdXNlciBjYW4gdXNlIGpvaW4gdG8gY29uc3RydWN0IFVOQyBwYXRocyBmcm9tXG4gIC8vIGEgc2VydmVyIG5hbWUgYW5kIGEgc2hhcmUgbmFtZTsgZm9yIGV4YW1wbGU6XG4gIC8vICAgcGF0aC5qb2luKCcvL3NlcnZlcicsICdzaGFyZScpIC0+ICdcXFxcXFxcXHNlcnZlclxcXFxzaGFyZVxcXFwnKVxuICBsZXQgbmVlZHNSZXBsYWNlID0gdHJ1ZTtcbiAgbGV0IHNsYXNoQ291bnQgPSAwO1xuICBhc3NlcnQoZmlyc3RQYXJ0ICE9PSBudWxsKTtcbiAgaWYgKGlzUGF0aFNlcGFyYXRvcihmaXJzdFBhcnQuY2hhckNvZGVBdCgwKSkpIHtcbiAgICArK3NsYXNoQ291bnQ7XG4gICAgY29uc3QgZmlyc3RMZW4gPSBmaXJzdFBhcnQubGVuZ3RoO1xuICAgIGlmIChmaXJzdExlbiA+IDEpIHtcbiAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoZmlyc3RQYXJ0LmNoYXJDb2RlQXQoMSkpKSB7XG4gICAgICAgICsrc2xhc2hDb3VudDtcbiAgICAgICAgaWYgKGZpcnN0TGVuID4gMikge1xuICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoZmlyc3RQYXJ0LmNoYXJDb2RlQXQoMikpKSArK3NsYXNoQ291bnQ7XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBXZSBtYXRjaGVkIGEgVU5DIHBhdGggaW4gdGhlIGZpcnN0IHBhcnRcbiAgICAgICAgICAgIG5lZWRzUmVwbGFjZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAobmVlZHNSZXBsYWNlKSB7XG4gICAgLy8gRmluZCBhbnkgbW9yZSBjb25zZWN1dGl2ZSBzbGFzaGVzIHdlIG5lZWQgdG8gcmVwbGFjZVxuICAgIGZvciAoOyBzbGFzaENvdW50IDwgam9pbmVkLmxlbmd0aDsgKytzbGFzaENvdW50KSB7XG4gICAgICBpZiAoIWlzUGF0aFNlcGFyYXRvcihqb2luZWQuY2hhckNvZGVBdChzbGFzaENvdW50KSkpIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIFJlcGxhY2UgdGhlIHNsYXNoZXMgaWYgbmVlZGVkXG4gICAgaWYgKHNsYXNoQ291bnQgPj0gMikgam9pbmVkID0gYFxcXFwke2pvaW5lZC5zbGljZShzbGFzaENvdW50KX1gO1xuICB9XG5cbiAgcmV0dXJuIG5vcm1hbGl6ZShqb2luZWQpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckMsU0FBUyxNQUFNLFFBQVEseUJBQXlCO0FBQ2hELFNBQVMsVUFBVSxRQUFRLDRCQUE0QjtBQUN2RCxTQUFTLGVBQWUsUUFBUSxhQUFhO0FBQzdDLFNBQVMsU0FBUyxRQUFRLGlCQUFpQjtBQUUzQzs7O0NBR0MsR0FDRCxPQUFPLFNBQVMsS0FBSyxHQUFHLEtBQWU7RUFDckMsSUFBSSxNQUFNLE1BQU0sS0FBSyxHQUFHLE9BQU87RUFFL0IsSUFBSTtFQUNKLElBQUksWUFBMkI7RUFDL0IsSUFBSyxJQUFJLElBQUksR0FBRyxJQUFJLE1BQU0sTUFBTSxFQUFFLEVBQUUsRUFBRztJQUNyQyxNQUFNLE9BQU8sS0FBSyxDQUFDLEVBQUU7SUFDckIsV0FBVztJQUNYLElBQUksS0FBSyxNQUFNLEdBQUcsR0FBRztNQUNuQixJQUFJLFdBQVcsV0FBVyxTQUFTLFlBQVk7V0FDMUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxNQUFNO0lBQzVCO0VBQ0Y7RUFFQSxJQUFJLFdBQVcsV0FBVyxPQUFPO0VBRWpDLHlFQUF5RTtFQUN6RSxvREFBb0Q7RUFDcEQsRUFBRTtFQUNGLG9FQUFvRTtFQUNwRSxtRUFBbUU7RUFDbkUseUVBQXlFO0VBQ3pFLHlDQUF5QztFQUN6QyxFQUFFO0VBQ0YsdUVBQXVFO0VBQ3ZFLGdFQUFnRTtFQUNoRSxvRUFBb0U7RUFDcEUsK0NBQStDO0VBQy9DLDZEQUE2RDtFQUM3RCxJQUFJLGVBQWU7RUFDbkIsSUFBSSxhQUFhO0VBQ2pCLE9BQU8sY0FBYztFQUNyQixJQUFJLGdCQUFnQixVQUFVLFVBQVUsQ0FBQyxLQUFLO0lBQzVDLEVBQUU7SUFDRixNQUFNLFdBQVcsVUFBVSxNQUFNO0lBQ2pDLElBQUksV0FBVyxHQUFHO01BQ2hCLElBQUksZ0JBQWdCLFVBQVUsVUFBVSxDQUFDLEtBQUs7UUFDNUMsRUFBRTtRQUNGLElBQUksV0FBVyxHQUFHO1VBQ2hCLElBQUksZ0JBQWdCLFVBQVUsVUFBVSxDQUFDLEtBQUssRUFBRTtlQUMzQztZQUNILDBDQUEwQztZQUMxQyxlQUFlO1VBQ2pCO1FBQ0Y7TUFDRjtJQUNGO0VBQ0Y7RUFDQSxJQUFJLGNBQWM7SUFDaEIsdURBQXVEO0lBQ3ZELE1BQU8sYUFBYSxPQUFPLE1BQU0sRUFBRSxFQUFFLFdBQVk7TUFDL0MsSUFBSSxDQUFDLGdCQUFnQixPQUFPLFVBQVUsQ0FBQyxjQUFjO0lBQ3ZEO0lBRUEsZ0NBQWdDO0lBQ2hDLElBQUksY0FBYyxHQUFHLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxLQUFLLENBQUMsYUFBYTtFQUMvRDtFQUVBLE9BQU8sVUFBVTtBQUNuQiJ9
// denoCacheMetadata=14944437242577471898,3442919683174583972