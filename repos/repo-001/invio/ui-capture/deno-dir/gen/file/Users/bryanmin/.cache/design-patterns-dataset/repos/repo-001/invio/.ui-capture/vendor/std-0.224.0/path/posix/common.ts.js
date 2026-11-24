// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { _common } from "../_common/common.ts";
import { SEPARATOR } from "./constants.ts";
/** Determines the common path from a set of paths, using an optional separator,
 * which defaults to the OS default separator.
 *
 * ```ts
 *       import { common } from "https://deno.land/std@$STD_VERSION/path/mod.ts";
 *       const p = common([
 *         "./deno/std/path/mod.ts",
 *         "./deno/std/fs/mod.ts",
 *       ]);
 *       console.log(p); // "./deno/std/"
 * ```
 */ export function common(paths, sep = SEPARATOR) {
  return _common(paths, sep);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjQuMC9wYXRoL3Bvc2l4L2NvbW1vbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBfY29tbW9uIH0gZnJvbSBcIi4uL19jb21tb24vY29tbW9uLnRzXCI7XG5pbXBvcnQgeyBTRVBBUkFUT1IgfSBmcm9tIFwiLi9jb25zdGFudHMudHNcIjtcblxuLyoqIERldGVybWluZXMgdGhlIGNvbW1vbiBwYXRoIGZyb20gYSBzZXQgb2YgcGF0aHMsIHVzaW5nIGFuIG9wdGlvbmFsIHNlcGFyYXRvcixcbiAqIHdoaWNoIGRlZmF1bHRzIHRvIHRoZSBPUyBkZWZhdWx0IHNlcGFyYXRvci5cbiAqXG4gKiBgYGB0c1xuICogICAgICAgaW1wb3J0IHsgY29tbW9uIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vcGF0aC9tb2QudHNcIjtcbiAqICAgICAgIGNvbnN0IHAgPSBjb21tb24oW1xuICogICAgICAgICBcIi4vZGVuby9zdGQvcGF0aC9tb2QudHNcIixcbiAqICAgICAgICAgXCIuL2Rlbm8vc3RkL2ZzL21vZC50c1wiLFxuICogICAgICAgXSk7XG4gKiAgICAgICBjb25zb2xlLmxvZyhwKTsgLy8gXCIuL2Rlbm8vc3RkL1wiXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbW1vbihcbiAgcGF0aHM6IHN0cmluZ1tdLFxuICBzZXA6IHN0cmluZyA9IFNFUEFSQVRPUixcbik6IHN0cmluZyB7XG4gIHJldHVybiBfY29tbW9uKHBhdGhzLCBzZXApO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckMsU0FBUyxPQUFPLFFBQVEsdUJBQXVCO0FBQy9DLFNBQVMsU0FBUyxRQUFRLGlCQUFpQjtBQUUzQzs7Ozs7Ozs7Ozs7Q0FXQyxHQUNELE9BQU8sU0FBUyxPQUNkLEtBQWUsRUFDZixNQUFjLFNBQVM7RUFFdkIsT0FBTyxRQUFRLE9BQU87QUFDeEIifQ==
// denoCacheMetadata=15616575085467067703,6109593500094733075