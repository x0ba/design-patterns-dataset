// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Stringify an object into a valid `.env` file format.
 *
 * @example
 * ```ts
 * import { stringify } from "https://deno.land/std@$STD_VERSION/dotenv/stringify.ts";
 *
 * const object = { GREETING: "hello world" };
 * const string = stringify(object); // GREETING='hello world'
 * ```
 *
 * @param object object to be stringified
 * @returns string of object
 */ export function stringify(object) {
  const lines = [];
  for (const [key, value] of Object.entries(object)){
    let quote;
    let escapedValue = value ?? "";
    if (key.startsWith("#")) {
      console.warn(`key starts with a '#' indicates a comment and is ignored: '${key}'`);
      continue;
    } else if (escapedValue.includes("\n")) {
      // escape inner new lines
      escapedValue = escapedValue.replaceAll("\n", "\\n");
      quote = `"`;
    } else if (escapedValue.match(/\W/)) {
      quote = "'";
    }
    if (quote) {
      // escape inner quotes
      escapedValue = escapedValue.replaceAll(quote, `\\${quote}`);
      escapedValue = `${quote}${escapedValue}${quote}`;
    }
    const line = `${key}=${escapedValue}`;
    lines.push(line);
  }
  return lines.join("\n");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjQuMC9kb3RlbnYvc3RyaW5naWZ5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbi8qKlxuICogU3RyaW5naWZ5IGFuIG9iamVjdCBpbnRvIGEgdmFsaWQgYC5lbnZgIGZpbGUgZm9ybWF0LlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgc3RyaW5naWZ5IH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vZG90ZW52L3N0cmluZ2lmeS50c1wiO1xuICpcbiAqIGNvbnN0IG9iamVjdCA9IHsgR1JFRVRJTkc6IFwiaGVsbG8gd29ybGRcIiB9O1xuICogY29uc3Qgc3RyaW5nID0gc3RyaW5naWZ5KG9iamVjdCk7IC8vIEdSRUVUSU5HPSdoZWxsbyB3b3JsZCdcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBvYmplY3Qgb2JqZWN0IHRvIGJlIHN0cmluZ2lmaWVkXG4gKiBAcmV0dXJucyBzdHJpbmcgb2Ygb2JqZWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnkob2JqZWN0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9iamVjdCkpIHtcbiAgICBsZXQgcXVvdGU7XG5cbiAgICBsZXQgZXNjYXBlZFZhbHVlID0gdmFsdWUgPz8gXCJcIjtcbiAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoXCIjXCIpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBrZXkgc3RhcnRzIHdpdGggYSAnIycgaW5kaWNhdGVzIGEgY29tbWVudCBhbmQgaXMgaWdub3JlZDogJyR7a2V5fSdgLFxuICAgICAgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH0gZWxzZSBpZiAoZXNjYXBlZFZhbHVlLmluY2x1ZGVzKFwiXFxuXCIpKSB7XG4gICAgICAvLyBlc2NhcGUgaW5uZXIgbmV3IGxpbmVzXG4gICAgICBlc2NhcGVkVmFsdWUgPSBlc2NhcGVkVmFsdWUucmVwbGFjZUFsbChcIlxcblwiLCBcIlxcXFxuXCIpO1xuICAgICAgcXVvdGUgPSBgXCJgO1xuICAgIH0gZWxzZSBpZiAoZXNjYXBlZFZhbHVlLm1hdGNoKC9cXFcvKSkge1xuICAgICAgcXVvdGUgPSBcIidcIjtcbiAgICB9XG5cbiAgICBpZiAocXVvdGUpIHtcbiAgICAgIC8vIGVzY2FwZSBpbm5lciBxdW90ZXNcbiAgICAgIGVzY2FwZWRWYWx1ZSA9IGVzY2FwZWRWYWx1ZS5yZXBsYWNlQWxsKHF1b3RlLCBgXFxcXCR7cXVvdGV9YCk7XG4gICAgICBlc2NhcGVkVmFsdWUgPSBgJHtxdW90ZX0ke2VzY2FwZWRWYWx1ZX0ke3F1b3RlfWA7XG4gICAgfVxuICAgIGNvbnN0IGxpbmUgPSBgJHtrZXl9PSR7ZXNjYXBlZFZhbHVlfWA7XG4gICAgbGluZXMucHVzaChsaW5lKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDOzs7Ozs7Ozs7Ozs7O0NBYUMsR0FDRCxPQUFPLFNBQVMsVUFBVSxNQUE4QjtFQUN0RCxNQUFNLFFBQWtCLEVBQUU7RUFDMUIsS0FBSyxNQUFNLENBQUMsS0FBSyxNQUFNLElBQUksT0FBTyxPQUFPLENBQUMsUUFBUztJQUNqRCxJQUFJO0lBRUosSUFBSSxlQUFlLFNBQVM7SUFDNUIsSUFBSSxJQUFJLFVBQVUsQ0FBQyxNQUFNO01BQ3ZCLFFBQVEsSUFBSSxDQUNWLENBQUMsMkRBQTJELEVBQUUsSUFBSSxDQUFDLENBQUM7TUFFdEU7SUFDRixPQUFPLElBQUksYUFBYSxRQUFRLENBQUMsT0FBTztNQUN0Qyx5QkFBeUI7TUFDekIsZUFBZSxhQUFhLFVBQVUsQ0FBQyxNQUFNO01BQzdDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDYixPQUFPLElBQUksYUFBYSxLQUFLLENBQUMsT0FBTztNQUNuQyxRQUFRO0lBQ1Y7SUFFQSxJQUFJLE9BQU87TUFDVCxzQkFBc0I7TUFDdEIsZUFBZSxhQUFhLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE9BQU87TUFDMUQsZUFBZSxHQUFHLFFBQVEsZUFBZSxPQUFPO0lBQ2xEO0lBQ0EsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEVBQUUsY0FBYztJQUNyQyxNQUFNLElBQUksQ0FBQztFQUNiO0VBQ0EsT0FBTyxNQUFNLElBQUksQ0FBQztBQUNwQiJ9
// denoCacheMetadata=8790391779648445248,2187503432339453374