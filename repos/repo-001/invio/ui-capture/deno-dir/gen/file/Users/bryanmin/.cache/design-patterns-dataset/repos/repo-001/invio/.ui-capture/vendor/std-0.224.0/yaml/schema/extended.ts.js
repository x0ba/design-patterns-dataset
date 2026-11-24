// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { Schema } from "../schema.ts";
import { regexp, undefinedType } from "../_type/mod.ts";
import { DEFAULT_SCHEMA } from "./default.ts";
/***
 * Extends JS-YAML default schema with additional JavaScript types
 * It is not described in the YAML specification.
 * Functions are no longer supported for security reasons.
 *
 * @example
 * ```ts
 * import {
 *   EXTENDED_SCHEMA,
 *   parse,
 * } from "https://deno.land/std@$STD_VERSION/yaml/mod.ts";
 *
 * const data = parse(
 *   `
 *   regexp:
 *     simple: !!js/regexp foobar
 *     modifiers: !!js/regexp /foobar/mi
 *   undefined: !!js/undefined ~
 * # Disabled, see: https://github.com/denoland/deno_std/pull/1275
 * #  function: !!js/function >
 * #    function foobar() {
 * #      return 'hello world!';
 * #    }
 * `,
 *   { schema: EXTENDED_SCHEMA },
 * );
 * ```
 */ export const EXTENDED_SCHEMA = new Schema({
  explicit: [
    regexp,
    undefinedType
  ],
  include: [
    DEFAULT_SCHEMA
  ]
});
/***
 * Extends JS-YAML default schema with additional JavaScript types
 * It is not described in the YAML specification.
 * Functions are no longer supported for security reasons.
 *
 * @example
 * ```ts
 * import {
 *   EXTENDED_SCHEMA,
 *   parse,
 * } from "https://deno.land/std@$STD_VERSION/yaml/mod.ts";
 *
 * const data = parse(
 *   `
 *   regexp:
 *     simple: !!js/regexp foobar
 *     modifiers: !!js/regexp /foobar/mi
 *   undefined: !!js/undefined ~
 * # Disabled, see: https://github.com/denoland/deno_std/pull/1275
 * #  function: !!js/function >
 * #    function foobar() {
 * #      return 'hello world!';
 * #    }
 * `,
 *   { schema: EXTENDED_SCHEMA },
 * );
 * ```
 *
 * @deprecated This will be removed in 1.0.0. Use {@link EXTENDED_SCHEMA} instead.
 */ export const extended = EXTENDED_SCHEMA;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjQuMC95YW1sL3NjaGVtYS9leHRlbmRlZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI0IHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBTY2hlbWEgfSBmcm9tIFwiLi4vc2NoZW1hLnRzXCI7XG5pbXBvcnQgeyByZWdleHAsIHVuZGVmaW5lZFR5cGUgfSBmcm9tIFwiLi4vX3R5cGUvbW9kLnRzXCI7XG5pbXBvcnQgeyBERUZBVUxUX1NDSEVNQSB9IGZyb20gXCIuL2RlZmF1bHQudHNcIjtcblxuLyoqKlxuICogRXh0ZW5kcyBKUy1ZQU1MIGRlZmF1bHQgc2NoZW1hIHdpdGggYWRkaXRpb25hbCBKYXZhU2NyaXB0IHR5cGVzXG4gKiBJdCBpcyBub3QgZGVzY3JpYmVkIGluIHRoZSBZQU1MIHNwZWNpZmljYXRpb24uXG4gKiBGdW5jdGlvbnMgYXJlIG5vIGxvbmdlciBzdXBwb3J0ZWQgZm9yIHNlY3VyaXR5IHJlYXNvbnMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQge1xuICogICBFWFRFTkRFRF9TQ0hFTUEsXG4gKiAgIHBhcnNlLFxuICogfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi95YW1sL21vZC50c1wiO1xuICpcbiAqIGNvbnN0IGRhdGEgPSBwYXJzZShcbiAqICAgYFxuICogICByZWdleHA6XG4gKiAgICAgc2ltcGxlOiAhIWpzL3JlZ2V4cCBmb29iYXJcbiAqICAgICBtb2RpZmllcnM6ICEhanMvcmVnZXhwIC9mb29iYXIvbWlcbiAqICAgdW5kZWZpbmVkOiAhIWpzL3VuZGVmaW5lZCB+XG4gKiAjIERpc2FibGVkLCBzZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9kZW5vbGFuZC9kZW5vX3N0ZC9wdWxsLzEyNzVcbiAqICMgIGZ1bmN0aW9uOiAhIWpzL2Z1bmN0aW9uID5cbiAqICMgICAgZnVuY3Rpb24gZm9vYmFyKCkge1xuICogIyAgICAgIHJldHVybiAnaGVsbG8gd29ybGQhJztcbiAqICMgICAgfVxuICogYCxcbiAqICAgeyBzY2hlbWE6IEVYVEVOREVEX1NDSEVNQSB9LFxuICogKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgRVhURU5ERURfU0NIRU1BOiBTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAgZXhwbGljaXQ6IFtyZWdleHAsIHVuZGVmaW5lZFR5cGVdLFxuICBpbmNsdWRlOiBbREVGQVVMVF9TQ0hFTUFdLFxufSk7XG5cbi8qKipcbiAqIEV4dGVuZHMgSlMtWUFNTCBkZWZhdWx0IHNjaGVtYSB3aXRoIGFkZGl0aW9uYWwgSmF2YVNjcmlwdCB0eXBlc1xuICogSXQgaXMgbm90IGRlc2NyaWJlZCBpbiB0aGUgWUFNTCBzcGVjaWZpY2F0aW9uLlxuICogRnVuY3Rpb25zIGFyZSBubyBsb25nZXIgc3VwcG9ydGVkIGZvciBzZWN1cml0eSByZWFzb25zLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgRVhURU5ERURfU0NIRU1BLFxuICogICBwYXJzZSxcbiAqIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04veWFtbC9tb2QudHNcIjtcbiAqXG4gKiBjb25zdCBkYXRhID0gcGFyc2UoXG4gKiAgIGBcbiAqICAgcmVnZXhwOlxuICogICAgIHNpbXBsZTogISFqcy9yZWdleHAgZm9vYmFyXG4gKiAgICAgbW9kaWZpZXJzOiAhIWpzL3JlZ2V4cCAvZm9vYmFyL21pXG4gKiAgIHVuZGVmaW5lZDogISFqcy91bmRlZmluZWQgflxuICogIyBEaXNhYmxlZCwgc2VlOiBodHRwczovL2dpdGh1Yi5jb20vZGVub2xhbmQvZGVub19zdGQvcHVsbC8xMjc1XG4gKiAjICBmdW5jdGlvbjogISFqcy9mdW5jdGlvbiA+XG4gKiAjICAgIGZ1bmN0aW9uIGZvb2JhcigpIHtcbiAqICMgICAgICByZXR1cm4gJ2hlbGxvIHdvcmxkISc7XG4gKiAjICAgIH1cbiAqIGAsXG4gKiAgIHsgc2NoZW1hOiBFWFRFTkRFRF9TQ0hFTUEgfSxcbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAZGVwcmVjYXRlZCBUaGlzIHdpbGwgYmUgcmVtb3ZlZCBpbiAxLjAuMC4gVXNlIHtAbGluayBFWFRFTkRFRF9TQ0hFTUF9IGluc3RlYWQuXG4gKi9cbmV4cG9ydCBjb25zdCBleHRlbmRlZCA9IEVYVEVOREVEX1NDSEVNQTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDLFNBQVMsTUFBTSxRQUFRLGVBQWU7QUFDdEMsU0FBUyxNQUFNLEVBQUUsYUFBYSxRQUFRLGtCQUFrQjtBQUN4RCxTQUFTLGNBQWMsUUFBUSxlQUFlO0FBRTlDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0EyQkMsR0FDRCxPQUFPLE1BQU0sa0JBQTBCLElBQUksT0FBTztFQUNoRCxVQUFVO0lBQUM7SUFBUTtHQUFjO0VBQ2pDLFNBQVM7SUFBQztHQUFlO0FBQzNCLEdBQUc7QUFFSDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E2QkMsR0FDRCxPQUFPLE1BQU0sV0FBVyxnQkFBZ0IifQ==
// denoCacheMetadata=3200236352036071976,6163855285149212285