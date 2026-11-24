// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// Copyright the Browserify authors. MIT License.
// Ported mostly from https://github.com/browserify/path-browserify/
// This module is browser compatible.
/**
 * Utilities for working with OS-specific file paths.
 *
 * Codes in the examples uses POSIX path but it automatically use Windows path
 * on Windows. Use methods under `posix` or `win32` object instead to handle non
 * platform specific path like:
 * ```ts
 * import { posix, win32 } from "https://deno.land/std@$STD_VERSION/path/mod.ts";
 * const p1 = posix.fromFileUrl("file:///home/foo");
 * const p2 = win32.fromFileUrl("file:///home/foo");
 * console.log(p1); // "/home/foo"
 * console.log(p2); // "\\home\\foo"
 * ```
 *
 * This module is browser compatible.
 *
 * @module
 */ export * from "./basename.ts";
export * from "./constants.ts";
export * from "./dirname.ts";
export * from "./extname.ts";
export * from "./format.ts";
export * from "./from_file_url.ts";
export * from "./is_absolute.ts";
export * from "./join.ts";
export * from "./normalize.ts";
export * from "./parse.ts";
export * from "./relative.ts";
export * from "./resolve.ts";
export * from "./to_file_url.ts";
export * from "./to_namespaced_path.ts";
export * from "./common.ts";
export * from "../_interface.ts";
export * from "./glob_to_regexp.ts";
export * from "./is_glob.ts";
export * from "./join_globs.ts";
export * from "./normalize_glob.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjQuMC9wYXRoL3Bvc2l4L21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IHRoZSBCcm93c2VyaWZ5IGF1dGhvcnMuIE1JVCBMaWNlbnNlLlxuLy8gUG9ydGVkIG1vc3RseSBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9icm93c2VyaWZ5L3BhdGgtYnJvd3NlcmlmeS9cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqXG4gKiBVdGlsaXRpZXMgZm9yIHdvcmtpbmcgd2l0aCBPUy1zcGVjaWZpYyBmaWxlIHBhdGhzLlxuICpcbiAqIENvZGVzIGluIHRoZSBleGFtcGxlcyB1c2VzIFBPU0lYIHBhdGggYnV0IGl0IGF1dG9tYXRpY2FsbHkgdXNlIFdpbmRvd3MgcGF0aFxuICogb24gV2luZG93cy4gVXNlIG1ldGhvZHMgdW5kZXIgYHBvc2l4YCBvciBgd2luMzJgIG9iamVjdCBpbnN0ZWFkIHRvIGhhbmRsZSBub25cbiAqIHBsYXRmb3JtIHNwZWNpZmljIHBhdGggbGlrZTpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBwb3NpeCwgd2luMzIgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9wYXRoL21vZC50c1wiO1xuICogY29uc3QgcDEgPSBwb3NpeC5mcm9tRmlsZVVybChcImZpbGU6Ly8vaG9tZS9mb29cIik7XG4gKiBjb25zdCBwMiA9IHdpbjMyLmZyb21GaWxlVXJsKFwiZmlsZTovLy9ob21lL2Zvb1wiKTtcbiAqIGNvbnNvbGUubG9nKHAxKTsgLy8gXCIvaG9tZS9mb29cIlxuICogY29uc29sZS5sb2cocDIpOyAvLyBcIlxcXFxob21lXFxcXGZvb1wiXG4gKiBgYGBcbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG4gKlxuICogQG1vZHVsZVxuICovXG5leHBvcnQgKiBmcm9tIFwiLi9iYXNlbmFtZS50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vY29uc3RhbnRzLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9kaXJuYW1lLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9leHRuYW1lLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9mb3JtYXQudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2Zyb21fZmlsZV91cmwudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2lzX2Fic29sdXRlLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9qb2luLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9ub3JtYWxpemUudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3BhcnNlLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9yZWxhdGl2ZS50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vcmVzb2x2ZS50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vdG9fZmlsZV91cmwudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3RvX25hbWVzcGFjZWRfcGF0aC50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vY29tbW9uLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi4vX2ludGVyZmFjZS50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vZ2xvYl90b19yZWdleHAudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2lzX2dsb2IudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2pvaW5fZ2xvYnMudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL25vcm1hbGl6ZV9nbG9iLnRzXCI7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLGlEQUFpRDtBQUNqRCxvRUFBb0U7QUFDcEUscUNBQXFDO0FBRXJDOzs7Ozs7Ozs7Ozs7Ozs7OztDQWlCQyxHQUNELGNBQWMsZ0JBQWdCO0FBQzlCLGNBQWMsaUJBQWlCO0FBQy9CLGNBQWMsZUFBZTtBQUM3QixjQUFjLGVBQWU7QUFDN0IsY0FBYyxjQUFjO0FBQzVCLGNBQWMscUJBQXFCO0FBQ25DLGNBQWMsbUJBQW1CO0FBQ2pDLGNBQWMsWUFBWTtBQUMxQixjQUFjLGlCQUFpQjtBQUMvQixjQUFjLGFBQWE7QUFDM0IsY0FBYyxnQkFBZ0I7QUFDOUIsY0FBYyxlQUFlO0FBQzdCLGNBQWMsbUJBQW1CO0FBQ2pDLGNBQWMsMEJBQTBCO0FBQ3hDLGNBQWMsY0FBYztBQUM1QixjQUFjLG1CQUFtQjtBQUNqQyxjQUFjLHNCQUFzQjtBQUNwQyxjQUFjLGVBQWU7QUFDN0IsY0FBYyxrQkFBa0I7QUFDaEMsY0FBYyxzQkFBc0IifQ==
// denoCacheMetadata=9525289107770604646,8257999629655326792