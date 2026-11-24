// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Utilities for
 * {@link https://datatracker.ietf.org/doc/html/rfc4648#section-5 | base64url}
 * encoding and decoding.
 *
 * This module is browser compatible.
 *
 * @module
 */ import * as base64 from "./base64.ts";
/**
 * Some variants allow or require omitting the padding '=' signs:
 * https://en.wikipedia.org/wiki/Base64#The_URL_applications
 *
 * @param base64url
 */ function addPaddingToBase64url(base64url) {
  if (base64url.length % 4 === 2) return base64url + "==";
  if (base64url.length % 4 === 3) return base64url + "=";
  if (base64url.length % 4 === 1) {
    throw new TypeError("Illegal base64url string!");
  }
  return base64url;
}
function convertBase64urlToBase64(b64url) {
  if (!/^[-_A-Z0-9]*?={0,2}$/i.test(b64url)) {
    // Contains characters not part of base64url spec.
    throw new TypeError("Failed to decode base64url: invalid character");
  }
  return addPaddingToBase64url(b64url).replace(/\-/g, "+").replace(/_/g, "/");
}
function convertBase64ToBase64url(b64) {
  return b64.endsWith("=") ? b64.endsWith("==") ? b64.replace(/\+/g, "-").replace(/\//g, "_").slice(0, -2) : b64.replace(/\+/g, "-").replace(/\//g, "_").slice(0, -1) : b64.replace(/\+/g, "-").replace(/\//g, "_");
}
/**
 * Convert data into a base64url-encoded string.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc4648#section-5}
 *
 * @example
 * ```ts
 * import { encodeBase64Url } from "https://deno.land/std@$STD_VERSION/encoding/base64url.ts";
 *
 * encodeBase64Url(new TextEncoder().encode("foobar")); // "Zm9vYmFy"
 * ```
 */ export function encodeBase64Url(data) {
  return convertBase64ToBase64url(base64.encodeBase64(data));
}
/**
 * Decodes a given base64url-encoded string.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc4648#section-5}
 *
 * @example
 * ```ts
 * import { decodeBase64Url } from "https://deno.land/std@$STD_VERSION/encoding/base64url.ts";
 *
 * decodeBase64Url("Zm9vYmFy"); // Uint8Array(6) [ 102, 111, 111, 98, 97, 114 ]
 * ```
 */ export function decodeBase64Url(b64url) {
  return base64.decodeBase64(convertBase64urlToBase64(b64url));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjEuMC9lbmNvZGluZy9iYXNlNjR1cmwudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqXG4gKiBVdGlsaXRpZXMgZm9yXG4gKiB7QGxpbmsgaHR0cHM6Ly9kYXRhdHJhY2tlci5pZXRmLm9yZy9kb2MvaHRtbC9yZmM0NjQ4I3NlY3Rpb24tNSB8IGJhc2U2NHVybH1cbiAqIGVuY29kaW5nIGFuZCBkZWNvZGluZy5cbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCAqIGFzIGJhc2U2NCBmcm9tIFwiLi9iYXNlNjQudHNcIjtcblxuLyoqXG4gKiBTb21lIHZhcmlhbnRzIGFsbG93IG9yIHJlcXVpcmUgb21pdHRpbmcgdGhlIHBhZGRpbmcgJz0nIHNpZ25zOlxuICogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQmFzZTY0I1RoZV9VUkxfYXBwbGljYXRpb25zXG4gKlxuICogQHBhcmFtIGJhc2U2NHVybFxuICovXG5mdW5jdGlvbiBhZGRQYWRkaW5nVG9CYXNlNjR1cmwoYmFzZTY0dXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoYmFzZTY0dXJsLmxlbmd0aCAlIDQgPT09IDIpIHJldHVybiBiYXNlNjR1cmwgKyBcIj09XCI7XG4gIGlmIChiYXNlNjR1cmwubGVuZ3RoICUgNCA9PT0gMykgcmV0dXJuIGJhc2U2NHVybCArIFwiPVwiO1xuICBpZiAoYmFzZTY0dXJsLmxlbmd0aCAlIDQgPT09IDEpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSWxsZWdhbCBiYXNlNjR1cmwgc3RyaW5nIVwiKTtcbiAgfVxuICByZXR1cm4gYmFzZTY0dXJsO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0QmFzZTY0dXJsVG9CYXNlNjQoYjY0dXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIS9eWy1fQS1aMC05XSo/PXswLDJ9JC9pLnRlc3QoYjY0dXJsKSkge1xuICAgIC8vIENvbnRhaW5zIGNoYXJhY3RlcnMgbm90IHBhcnQgb2YgYmFzZTY0dXJsIHNwZWMuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBkZWNvZGUgYmFzZTY0dXJsOiBpbnZhbGlkIGNoYXJhY3RlclwiKTtcbiAgfVxuICByZXR1cm4gYWRkUGFkZGluZ1RvQmFzZTY0dXJsKGI2NHVybCkucmVwbGFjZSgvXFwtL2csIFwiK1wiKS5yZXBsYWNlKC9fL2csIFwiL1wiKTtcbn1cblxuZnVuY3Rpb24gY29udmVydEJhc2U2NFRvQmFzZTY0dXJsKGI2NDogc3RyaW5nKSB7XG4gIHJldHVybiBiNjQuZW5kc1dpdGgoXCI9XCIpXG4gICAgPyBiNjQuZW5kc1dpdGgoXCI9PVwiKVxuICAgICAgPyBiNjQucmVwbGFjZSgvXFwrL2csIFwiLVwiKS5yZXBsYWNlKC9cXC8vZywgXCJfXCIpLnNsaWNlKDAsIC0yKVxuICAgICAgOiBiNjQucmVwbGFjZSgvXFwrL2csIFwiLVwiKS5yZXBsYWNlKC9cXC8vZywgXCJfXCIpLnNsaWNlKDAsIC0xKVxuICAgIDogYjY0LnJlcGxhY2UoL1xcKy9nLCBcIi1cIikucmVwbGFjZSgvXFwvL2csIFwiX1wiKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGRhdGEgaW50byBhIGJhc2U2NHVybC1lbmNvZGVkIHN0cmluZy5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RhdGF0cmFja2VyLmlldGYub3JnL2RvYy9odG1sL3JmYzQ2NDgjc2VjdGlvbi01fVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgZW5jb2RlQmFzZTY0VXJsIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vZW5jb2RpbmcvYmFzZTY0dXJsLnRzXCI7XG4gKlxuICogZW5jb2RlQmFzZTY0VXJsKG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShcImZvb2JhclwiKSk7IC8vIFwiWm05dlltRnlcIlxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGVCYXNlNjRVcmwoXG4gIGRhdGE6IEFycmF5QnVmZmVyIHwgVWludDhBcnJheSB8IHN0cmluZyxcbik6IHN0cmluZyB7XG4gIHJldHVybiBjb252ZXJ0QmFzZTY0VG9CYXNlNjR1cmwoYmFzZTY0LmVuY29kZUJhc2U2NChkYXRhKSk7XG59XG5cbi8qKlxuICogRGVjb2RlcyBhIGdpdmVuIGJhc2U2NHVybC1lbmNvZGVkIHN0cmluZy5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RhdGF0cmFja2VyLmlldGYub3JnL2RvYy9odG1sL3JmYzQ2NDgjc2VjdGlvbi01fVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgZGVjb2RlQmFzZTY0VXJsIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vZW5jb2RpbmcvYmFzZTY0dXJsLnRzXCI7XG4gKlxuICogZGVjb2RlQmFzZTY0VXJsKFwiWm05dlltRnlcIik7IC8vIFVpbnQ4QXJyYXkoNikgWyAxMDIsIDExMSwgMTExLCA5OCwgOTcsIDExNCBdXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZUJhc2U2NFVybChiNjR1cmw6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICByZXR1cm4gYmFzZTY0LmRlY29kZUJhc2U2NChjb252ZXJ0QmFzZTY0dXJsVG9CYXNlNjQoYjY0dXJsKSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHFDQUFxQztBQUVyQzs7Ozs7Ozs7Q0FRQyxHQUVELFlBQVksWUFBWSxjQUFjO0FBRXRDOzs7OztDQUtDLEdBQ0QsU0FBUyxzQkFBc0IsU0FBaUI7RUFDOUMsSUFBSSxVQUFVLE1BQU0sR0FBRyxNQUFNLEdBQUcsT0FBTyxZQUFZO0VBQ25ELElBQUksVUFBVSxNQUFNLEdBQUcsTUFBTSxHQUFHLE9BQU8sWUFBWTtFQUNuRCxJQUFJLFVBQVUsTUFBTSxHQUFHLE1BQU0sR0FBRztJQUM5QixNQUFNLElBQUksVUFBVTtFQUN0QjtFQUNBLE9BQU87QUFDVDtBQUVBLFNBQVMseUJBQXlCLE1BQWM7RUFDOUMsSUFBSSxDQUFDLHdCQUF3QixJQUFJLENBQUMsU0FBUztJQUN6QyxrREFBa0Q7SUFDbEQsTUFBTSxJQUFJLFVBQVU7RUFDdEI7RUFDQSxPQUFPLHNCQUFzQixRQUFRLE9BQU8sQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLE1BQU07QUFDekU7QUFFQSxTQUFTLHlCQUF5QixHQUFXO0VBQzNDLE9BQU8sSUFBSSxRQUFRLENBQUMsT0FDaEIsSUFBSSxRQUFRLENBQUMsUUFDWCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQ3RELElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FDeEQsSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxPQUFPO0FBQzdDO0FBRUE7Ozs7Ozs7Ozs7O0NBV0MsR0FDRCxPQUFPLFNBQVMsZ0JBQ2QsSUFBdUM7RUFFdkMsT0FBTyx5QkFBeUIsT0FBTyxZQUFZLENBQUM7QUFDdEQ7QUFFQTs7Ozs7Ozs7Ozs7Q0FXQyxHQUNELE9BQU8sU0FBUyxnQkFBZ0IsTUFBYztFQUM1QyxPQUFPLE9BQU8sWUFBWSxDQUFDLHlCQUF5QjtBQUN0RCJ9
// denoCacheMetadata=9116476727701265076,6623454377226660017