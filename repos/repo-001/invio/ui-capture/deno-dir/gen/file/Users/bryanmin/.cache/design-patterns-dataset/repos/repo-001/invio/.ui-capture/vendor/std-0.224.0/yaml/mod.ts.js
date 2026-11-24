// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * {@linkcode parse} and {@linkcode stringify} for handling
 * {@link https://yaml.org/ | YAML} encoded data.
 *
 * Ported from
 * {@link https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da | js-yaml v3.13.1}.
 *
 * If your YAML contains multiple documents in it, you can use {@linkcode parseAll} for
 * handling it.
 *
 * To handle `regexp`, and `undefined` types, use {@linkcode EXTENDED_SCHEMA}.
 * You can also use custom types by extending schemas.
 *
 * ## :warning: Limitations
 * - `binary` type is currently not stable.
 *
 * For further examples see https://github.com/nodeca/js-yaml/tree/master/examples.
 * @example
 * ```ts
 * import {
 *   parse,
 *   stringify,
 * } from "https://deno.land/std@$STD_VERSION/yaml/mod.ts";
 *
 * const data = parse(`
 * foo: bar
 * baz:
 *   - qux
 *   - quux
 * `);
 * console.log(data);
 * // => { foo: "bar", baz: [ "qux", "quux" ] }
 *
 * const yaml = stringify({ foo: "bar", baz: ["qux", "quux"] });
 * console.log(yaml);
 * // =>
 * // foo: bar
 * // baz:
 * //   - qux
 * //   - quux
 * ```
 *
 * @module
 */ export * from "./parse.ts";
export * from "./stringify.ts";
export * from "./type.ts";
export * from "./schema/mod.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjQuMC95YW1sL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxMS0yMDE1IGJ5IFZpdGFseSBQdXpyaW4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqXG4gKiB7QGxpbmtjb2RlIHBhcnNlfSBhbmQge0BsaW5rY29kZSBzdHJpbmdpZnl9IGZvciBoYW5kbGluZ1xuICoge0BsaW5rIGh0dHBzOi8veWFtbC5vcmcvIHwgWUFNTH0gZW5jb2RlZCBkYXRhLlxuICpcbiAqIFBvcnRlZCBmcm9tXG4gKiB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sL2NvbW1pdC82NjVhYWRkYTQyMzQ5ZGNhZTg2OWYxMjA0MGQ5YjEwZWYxOGQxMmRhIHwganMteWFtbCB2My4xMy4xfS5cbiAqXG4gKiBJZiB5b3VyIFlBTUwgY29udGFpbnMgbXVsdGlwbGUgZG9jdW1lbnRzIGluIGl0LCB5b3UgY2FuIHVzZSB7QGxpbmtjb2RlIHBhcnNlQWxsfSBmb3JcbiAqIGhhbmRsaW5nIGl0LlxuICpcbiAqIFRvIGhhbmRsZSBgcmVnZXhwYCwgYW5kIGB1bmRlZmluZWRgIHR5cGVzLCB1c2Uge0BsaW5rY29kZSBFWFRFTkRFRF9TQ0hFTUF9LlxuICogWW91IGNhbiBhbHNvIHVzZSBjdXN0b20gdHlwZXMgYnkgZXh0ZW5kaW5nIHNjaGVtYXMuXG4gKlxuICogIyMgOndhcm5pbmc6IExpbWl0YXRpb25zXG4gKiAtIGBiaW5hcnlgIHR5cGUgaXMgY3VycmVudGx5IG5vdCBzdGFibGUuXG4gKlxuICogRm9yIGZ1cnRoZXIgZXhhbXBsZXMgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlY2EvanMteWFtbC90cmVlL21hc3Rlci9leGFtcGxlcy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgcGFyc2UsXG4gKiAgIHN0cmluZ2lmeSxcbiAqIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04veWFtbC9tb2QudHNcIjtcbiAqXG4gKiBjb25zdCBkYXRhID0gcGFyc2UoYFxuICogZm9vOiBiYXJcbiAqIGJhejpcbiAqICAgLSBxdXhcbiAqICAgLSBxdXV4XG4gKiBgKTtcbiAqIGNvbnNvbGUubG9nKGRhdGEpO1xuICogLy8gPT4geyBmb286IFwiYmFyXCIsIGJhejogWyBcInF1eFwiLCBcInF1dXhcIiBdIH1cbiAqXG4gKiBjb25zdCB5YW1sID0gc3RyaW5naWZ5KHsgZm9vOiBcImJhclwiLCBiYXo6IFtcInF1eFwiLCBcInF1dXhcIl0gfSk7XG4gKiBjb25zb2xlLmxvZyh5YW1sKTtcbiAqIC8vID0+XG4gKiAvLyBmb286IGJhclxuICogLy8gYmF6OlxuICogLy8gICAtIHF1eFxuICogLy8gICAtIHF1dXhcbiAqIGBgYFxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5leHBvcnQgKiBmcm9tIFwiLi9wYXJzZS50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vc3RyaW5naWZ5LnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi90eXBlLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9zY2hlbWEvbW9kLnRzXCI7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0EyQ0MsR0FFRCxjQUFjLGFBQWE7QUFDM0IsY0FBYyxpQkFBaUI7QUFDL0IsY0FBYyxZQUFZO0FBQzFCLGNBQWMsa0JBQWtCIn0=
// denoCacheMetadata=3573383363872046638,12045413104051789320