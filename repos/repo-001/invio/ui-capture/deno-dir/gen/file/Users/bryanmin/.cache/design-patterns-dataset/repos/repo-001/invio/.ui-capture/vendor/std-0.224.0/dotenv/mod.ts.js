// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
/**
 * Parses and loads environment variables from a `.env` file into the current
 * process, or stringify data into a `.env` file format.
 *
 * @module
 */ import { parse } from "./parse.ts";
export * from "./stringify.ts";
export * from "./parse.ts";
/** Works identically to {@linkcode load}, but synchronously. */ export function loadSync({ envPath = ".env", examplePath = ".env.example", defaultsPath = ".env.defaults", export: _export = false, allowEmptyValues = false } = {}) {
  const conf = envPath ? parseFileSync(envPath) : {};
  if (defaultsPath) {
    const confDefaults = parseFileSync(defaultsPath);
    for (const [key, value] of Object.entries(confDefaults)){
      if (!(key in conf)) {
        conf[key] = value;
      }
    }
  }
  if (examplePath) {
    const confExample = parseFileSync(examplePath);
    assertSafe(conf, confExample, allowEmptyValues);
  }
  if (_export) {
    for (const [key, value] of Object.entries(conf)){
      if (Deno.env.get(key) !== undefined) continue;
      Deno.env.set(key, value);
    }
  }
  return conf;
}
/**
 * Load environment variables from a `.env` file.  Loaded variables are accessible
 * in a configuration object returned by the `load()` function, as well as optionally
 * exporting them to the process environment using the `export` option.
 *
 * Inspired by the node modules {@linkcode https://github.com/motdotla/dotenv | dotenv}
 * and {@linkcode https://github.com/motdotla/dotenv-expand | dotenv-expand}.
 *
 * ## Basic usage
 * ```sh
 * # .env
 * GREETING=hello world
 * ```
 *
 * Then import the environment variables using the `load` function.
 *
 * ```ts
 * // app.ts
 * import { load } from "https://deno.land/std@$STD_VERSION/dotenv/mod.ts";
 *
 * console.log(await load({export: true})); // { GREETING: "hello world" }
 * console.log(Deno.env.get("GREETING")); // hello world
 * ```
 *
 * Run this with `deno run --allow-read --allow-env app.ts`.
 *
 * .env files support blank lines, comments, multi-line values and more.
 * See Parsing Rules below for more detail.
 *
 * ## Auto loading
 * Import the `load.ts` module to auto-import from the `.env` file and into
 * the process environment.
 *
 * ```ts
 * // app.ts
 * import "https://deno.land/std@$STD_VERSION/dotenv/load.ts";
 *
 * console.log(Deno.env.get("GREETING")); // hello world
 * ```
 *
 * Run this with `deno run --allow-read --allow-env app.ts`.
 *
 * ## Files
 * Dotenv supports a number of different files, all of which are optional.
 * File names and paths are configurable.
 *
 * |File|Purpose|
 * |----|-------|
 * |.env|primary file for storing key-value environment entries
 * |.env.example|this file does not set any values, but specifies env variables which must be present in the configuration object or process environment after loading dotenv
 * |.env.defaults|specify default values for env variables to be used when there is no entry in the `.env` file
 *
 * ### Example file
 *
 * The purpose of the example file is to provide a list of environment
 * variables which must be set or already present in the process environment
 * or an exception will be thrown.  These
 * variables may be set externally or loaded via the `.env` or
 * `.env.defaults` files.  A description may also be provided to help
 * understand the purpose of the env variable. The values in this file
 * are for documentation only and are not set in the environment. Example:
 *
 * ```sh
 * # .env.example
 *
 * # With optional description (this is not set in the environment)
 * DATA_KEY=API key for the api.data.com service.
 *
 * # Without description
 * DATA_URL=
 * ```
 *
 * When the above file is present, after dotenv is loaded, if either
 * DATA_KEY or DATA_URL is not present in the environment an exception
 * is thrown.
 *
 * ### Defaults
 *
 * This file is used to provide a list of default environment variables
 * which will be used if there is no overriding variable in the `.env`
 * file.
 *
 * ```sh
 * # .env.defaults
 * KEY_1=DEFAULT_VALUE
 * KEY_2=ANOTHER_DEFAULT_VALUE
 * ```
 * ```sh
 * # .env
 * KEY_1=ABCD
 * ```
 * The environment variables set after dotenv loads are:
 * ```sh
 * KEY_1=ABCD
 * KEY_2=ANOTHER_DEFAULT_VALUE
 * ```
 *
 * ## Configuration
 *
 * Loading environment files comes with a number of options passed into
 * the `load()` function, all of which are optional.
 *
 * |Option|Default|Description
 * |------|-------|-----------
 * |envPath|./.env|Path and filename of the `.env` file.  Use null to prevent the .env file from being loaded.
 * |defaultsPath|./.env.defaults|Path and filename of the `.env.defaults` file. Use null to prevent the .env.defaults file from being loaded.
 * |examplePath|./.env.example|Path and filename of the `.env.example` file. Use null to prevent the .env.example file from being loaded.
 * |export|false|When true, this will export all environment variables in the `.env` and `.env.default` files to the process environment (e.g. for use by `Deno.env.get()`) but only if they are not already set.  If a variable is already in the process, the `.env` value is ignored.
 * |allowEmptyValues|false|Allows empty values for specified env variables (throws otherwise)
 *
 * ### Example configuration
 * ```ts
 * import { load } from "https://deno.land/std@$STD_VERSION/dotenv/mod.ts";
 *
 * const conf = await load({
 *     envPath: "./.env_prod",
 *     examplePath: "./.env_required",
 *     export: true,
 *     allowEmptyValues: true,
 *   });
 * ```
 *
 * ## Permissions
 *
 * At a minimum, loading the `.env` related files requires the `--allow-read` permission.  Additionally, if
 * you access the process environment, either through exporting your configuration or expanding variables
 * in your `.env` file, you will need the `--allow-env` permission.  E.g.
 *
 * ```sh
 * deno run --allow-read=.env,.env.defaults,.env.example --allow-env=ENV1,ENV2 app.ts
 * ```
 *
 * ## Parsing Rules
 *
 * The parsing engine currently supports the following rules:
 *
 * - Variables that already exist in the environment are not overridden with
 *   `export: true`
 * - `BASIC=basic` becomes `{ BASIC: "basic" }`
 * - empty lines are skipped
 * - lines beginning with `#` are treated as comments
 * - empty values become empty strings (`EMPTY=` becomes `{ EMPTY: "" }`)
 * - single and double quoted values are escaped (`SINGLE_QUOTE='quoted'` becomes
 *   `{ SINGLE_QUOTE: "quoted" }`)
 * - new lines are expanded in double quoted values (`MULTILINE="new\nline"`
 *   becomes
 *
 * ```
 * { MULTILINE: "new\nline" }
 * ```
 *
 * - inner quotes are maintained (think JSON) (`JSON={"foo": "bar"}` becomes
 *   `{ JSON: "{\"foo\": \"bar\"}" }`)
 * - whitespace is removed from both ends of unquoted values (see more on
 *   {@linkcode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim | trim})
 *   (`FOO= some value` becomes `{ FOO: "some value" }`)
 * - whitespace is preserved on both ends of quoted values (`FOO=" some value "`
 *   becomes `{ FOO: " some value " }`)
 * - dollar sign with an environment key in or without curly braces in unquoted
 *   values will expand the environment key (`KEY=$KEY` or `KEY=${KEY}` becomes
 *   `{ KEY: "<KEY_VALUE_FROM_ENV>" }`)
 * - escaped dollar sign with an environment key in unquoted values will escape the
 *   environment key rather than expand (`KEY=\$KEY` becomes `{ KEY: "\\$KEY" }`)
 * - colon and a minus sign with a default value(which can also be another expand
 *   value) in expanding construction in unquoted values will first attempt to
 *   expand the environment key. If it’s not found, then it will return the default
 *   value (`KEY=${KEY:-default}` If KEY exists it becomes
 *   `{ KEY: "<KEY_VALUE_FROM_ENV>" }` If not, then it becomes
 *   `{ KEY: "default" }`. Also there is possible to do this case
 *   `KEY=${NO_SUCH_KEY:-${EXISTING_KEY:-default}}` which becomes
 *   `{ KEY: "<EXISTING_KEY_VALUE_FROM_ENV>" }`)
 */ export async function load({ envPath = ".env", examplePath = ".env.example", defaultsPath = ".env.defaults", export: _export = false, allowEmptyValues = false } = {}) {
  const conf = envPath ? await parseFile(envPath) : {};
  if (defaultsPath) {
    const confDefaults = await parseFile(defaultsPath);
    for (const [key, value] of Object.entries(confDefaults)){
      if (!(key in conf)) {
        conf[key] = value;
      }
    }
  }
  if (examplePath) {
    const confExample = await parseFile(examplePath);
    assertSafe(conf, confExample, allowEmptyValues);
  }
  if (_export) {
    for (const [key, value] of Object.entries(conf)){
      if (Deno.env.get(key) !== undefined) continue;
      Deno.env.set(key, value);
    }
  }
  return conf;
}
function parseFileSync(filepath) {
  try {
    return parse(Deno.readTextFileSync(filepath));
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return {};
    throw e;
  }
}
async function parseFile(filepath) {
  try {
    return parse(await Deno.readTextFile(filepath));
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return {};
    throw e;
  }
}
function assertSafe(conf, confExample, allowEmptyValues) {
  const missingEnvVars = [];
  for(const key in confExample){
    if (key in conf) {
      if (!allowEmptyValues && conf[key] === "") {
        missingEnvVars.push(key);
      }
    } else if (Deno.env.get(key) !== undefined) {
      if (!allowEmptyValues && Deno.env.get(key) === "") {
        missingEnvVars.push(key);
      }
    } else {
      missingEnvVars.push(key);
    }
  }
  if (missingEnvVars.length > 0) {
    const errorMessages = [
      `The following variables were defined in the example file but are not present in the environment:\n  ${missingEnvVars.join(", ")}`,
      `Make sure to add them to your env file.`,
      !allowEmptyValues && `If you expect any of these variables to be empty, you can set the allowEmptyValues option to true.`
    ];
    throw new MissingEnvVarsError(errorMessages.filter(Boolean).join("\n\n"), missingEnvVars);
  }
}
/**
 * Error thrown in {@linkcode load} and {@linkcode loadSync} when required
 * environment variables are missing.
 */ export class MissingEnvVarsError extends Error {
  /** The keys of the missing environment variables. */ missing;
  /** Constructs a new instance. */ constructor(message, missing){
    super(message);
    this.name = "MissingEnvVarsError";
    this.missing = missing;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjQuMC9kb3RlbnYvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjQgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogUGFyc2VzIGFuZCBsb2FkcyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZnJvbSBhIGAuZW52YCBmaWxlIGludG8gdGhlIGN1cnJlbnRcbiAqIHByb2Nlc3MsIG9yIHN0cmluZ2lmeSBkYXRhIGludG8gYSBgLmVudmAgZmlsZSBmb3JtYXQuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHBhcnNlIH0gZnJvbSBcIi4vcGFyc2UudHNcIjtcblxuZXhwb3J0ICogZnJvbSBcIi4vc3RyaW5naWZ5LnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9wYXJzZS50c1wiO1xuXG4vKiogT3B0aW9ucyBmb3Ige0BsaW5rY29kZSBsb2FkfSBhbmQge0BsaW5rY29kZSBsb2FkU3luY30uICovXG5leHBvcnQgaW50ZXJmYWNlIExvYWRPcHRpb25zIHtcbiAgLyoqXG4gICAqIE9wdGlvbmFsIHBhdGggdG8gYC5lbnZgIGZpbGUuIFRvIHByZXZlbnQgdGhlIGRlZmF1bHQgdmFsdWUgZnJvbSBiZWluZ1xuICAgKiB1c2VkLCBzZXQgdG8gYG51bGxgLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7XCIuLy5lbnZcIn1cbiAgICovXG4gIGVudlBhdGg/OiBzdHJpbmcgfCBudWxsO1xuXG4gIC8qKlxuICAgKiBTZXQgdG8gYHRydWVgIHRvIGV4cG9ydCBhbGwgYC5lbnZgIHZhcmlhYmxlcyB0byB0aGUgY3VycmVudCBwcm9jZXNzZXNcbiAgICogZW52aXJvbm1lbnQuIFZhcmlhYmxlcyBhcmUgdGhlbiBhY2Nlc3NpYmxlIHZpYSBgRGVuby5lbnYuZ2V0KDxrZXk+KWAuXG4gICAqXG4gICAqIEBkZWZhdWx0IHtmYWxzZX1cbiAgICovXG4gIGV4cG9ydD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIHBhdGggdG8gYC5lbnYuZXhhbXBsZWAgZmlsZSB3aGljaCBpcyB1c2VkIGZvciB2YWxpZGF0aW9uLlxuICAgKiBUbyBwcmV2ZW50IHRoZSBkZWZhdWx0IHZhbHVlIGZyb20gYmVpbmcgdXNlZCwgc2V0IHRvIGBudWxsYC5cbiAgICpcbiAgICogQGRlZmF1bHQge1wiLi8uZW52LmV4YW1wbGVcIn1cbiAgICovXG4gIGV4YW1wbGVQYXRoPzogc3RyaW5nIHwgbnVsbDtcblxuICAvKipcbiAgICogU2V0IHRvIGB0cnVlYCB0byBhbGxvdyByZXF1aXJlZCBlbnYgdmFyaWFibGVzIHRvIGJlIGVtcHR5LiBPdGhlcndpc2UsIGl0XG4gICAqIHdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgYW55IHZhcmlhYmxlIGlzIGVtcHR5LlxuICAgKlxuICAgKiBAZGVmYXVsdCB7ZmFsc2V9XG4gICAqL1xuICBhbGxvd0VtcHR5VmFsdWVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogT3B0aW9uYWwgcGF0aCB0byBgLmVudi5kZWZhdWx0c2AgZmlsZSB3aGljaCBpcyB1c2VkIHRvIGRlZmluZSBkZWZhdWx0XG4gICAqIChmYWxsYmFjaykgdmFsdWVzLiBUbyBwcmV2ZW50IHRoZSBkZWZhdWx0IHZhbHVlIGZyb20gYmVpbmcgdXNlZCxcbiAgICogc2V0IHRvIGBudWxsYC5cbiAgICpcbiAgICogYGBgc2hcbiAgICogIyAuZW52LmRlZmF1bHRzXG4gICAqICMgV2lsbCBub3QgYmUgc2V0IGlmIEdSRUVUSU5HIGlzIHNldCBpbiBiYXNlIC5lbnYgZmlsZVxuICAgKiBHUkVFVElORz1cImEgc2VjcmV0IHRvIGV2ZXJ5Ym9keVwiXG4gICAqIGBgYFxuICAgKlxuICAgKiBAZGVmYXVsdCB7XCIuLy5lbnYuZGVmYXVsdHNcIn1cbiAgICovXG4gIGRlZmF1bHRzUGF0aD86IHN0cmluZyB8IG51bGw7XG59XG5cbi8qKiBXb3JrcyBpZGVudGljYWxseSB0byB7QGxpbmtjb2RlIGxvYWR9LCBidXQgc3luY2hyb25vdXNseS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkU3luYyhcbiAge1xuICAgIGVudlBhdGggPSBcIi5lbnZcIixcbiAgICBleGFtcGxlUGF0aCA9IFwiLmVudi5leGFtcGxlXCIsXG4gICAgZGVmYXVsdHNQYXRoID0gXCIuZW52LmRlZmF1bHRzXCIsXG4gICAgZXhwb3J0OiBfZXhwb3J0ID0gZmFsc2UsXG4gICAgYWxsb3dFbXB0eVZhbHVlcyA9IGZhbHNlLFxuICB9OiBMb2FkT3B0aW9ucyA9IHt9LFxuKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gIGNvbnN0IGNvbmYgPSBlbnZQYXRoID8gcGFyc2VGaWxlU3luYyhlbnZQYXRoKSA6IHt9O1xuXG4gIGlmIChkZWZhdWx0c1BhdGgpIHtcbiAgICBjb25zdCBjb25mRGVmYXVsdHMgPSBwYXJzZUZpbGVTeW5jKGRlZmF1bHRzUGF0aCk7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoY29uZkRlZmF1bHRzKSkge1xuICAgICAgaWYgKCEoa2V5IGluIGNvbmYpKSB7XG4gICAgICAgIGNvbmZba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChleGFtcGxlUGF0aCkge1xuICAgIGNvbnN0IGNvbmZFeGFtcGxlID0gcGFyc2VGaWxlU3luYyhleGFtcGxlUGF0aCk7XG4gICAgYXNzZXJ0U2FmZShjb25mLCBjb25mRXhhbXBsZSwgYWxsb3dFbXB0eVZhbHVlcyk7XG4gIH1cblxuICBpZiAoX2V4cG9ydCkge1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGNvbmYpKSB7XG4gICAgICBpZiAoRGVuby5lbnYuZ2V0KGtleSkgIT09IHVuZGVmaW5lZCkgY29udGludWU7XG4gICAgICBEZW5vLmVudi5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNvbmY7XG59XG5cbi8qKlxuICogTG9hZCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZnJvbSBhIGAuZW52YCBmaWxlLiAgTG9hZGVkIHZhcmlhYmxlcyBhcmUgYWNjZXNzaWJsZVxuICogaW4gYSBjb25maWd1cmF0aW9uIG9iamVjdCByZXR1cm5lZCBieSB0aGUgYGxvYWQoKWAgZnVuY3Rpb24sIGFzIHdlbGwgYXMgb3B0aW9uYWxseVxuICogZXhwb3J0aW5nIHRoZW0gdG8gdGhlIHByb2Nlc3MgZW52aXJvbm1lbnQgdXNpbmcgdGhlIGBleHBvcnRgIG9wdGlvbi5cbiAqXG4gKiBJbnNwaXJlZCBieSB0aGUgbm9kZSBtb2R1bGVzIHtAbGlua2NvZGUgaHR0cHM6Ly9naXRodWIuY29tL21vdGRvdGxhL2RvdGVudiB8IGRvdGVudn1cbiAqIGFuZCB7QGxpbmtjb2RlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3Rkb3RsYS9kb3RlbnYtZXhwYW5kIHwgZG90ZW52LWV4cGFuZH0uXG4gKlxuICogIyMgQmFzaWMgdXNhZ2VcbiAqIGBgYHNoXG4gKiAjIC5lbnZcbiAqIEdSRUVUSU5HPWhlbGxvIHdvcmxkXG4gKiBgYGBcbiAqXG4gKiBUaGVuIGltcG9ydCB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIHVzaW5nIHRoZSBgbG9hZGAgZnVuY3Rpb24uXG4gKlxuICogYGBgdHNcbiAqIC8vIGFwcC50c1xuICogaW1wb3J0IHsgbG9hZCB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2RvdGVudi9tb2QudHNcIjtcbiAqXG4gKiBjb25zb2xlLmxvZyhhd2FpdCBsb2FkKHtleHBvcnQ6IHRydWV9KSk7IC8vIHsgR1JFRVRJTkc6IFwiaGVsbG8gd29ybGRcIiB9XG4gKiBjb25zb2xlLmxvZyhEZW5vLmVudi5nZXQoXCJHUkVFVElOR1wiKSk7IC8vIGhlbGxvIHdvcmxkXG4gKiBgYGBcbiAqXG4gKiBSdW4gdGhpcyB3aXRoIGBkZW5vIHJ1biAtLWFsbG93LXJlYWQgLS1hbGxvdy1lbnYgYXBwLnRzYC5cbiAqXG4gKiAuZW52IGZpbGVzIHN1cHBvcnQgYmxhbmsgbGluZXMsIGNvbW1lbnRzLCBtdWx0aS1saW5lIHZhbHVlcyBhbmQgbW9yZS5cbiAqIFNlZSBQYXJzaW5nIFJ1bGVzIGJlbG93IGZvciBtb3JlIGRldGFpbC5cbiAqXG4gKiAjIyBBdXRvIGxvYWRpbmdcbiAqIEltcG9ydCB0aGUgYGxvYWQudHNgIG1vZHVsZSB0byBhdXRvLWltcG9ydCBmcm9tIHRoZSBgLmVudmAgZmlsZSBhbmQgaW50b1xuICogdGhlIHByb2Nlc3MgZW52aXJvbm1lbnQuXG4gKlxuICogYGBgdHNcbiAqIC8vIGFwcC50c1xuICogaW1wb3J0IFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9kb3RlbnYvbG9hZC50c1wiO1xuICpcbiAqIGNvbnNvbGUubG9nKERlbm8uZW52LmdldChcIkdSRUVUSU5HXCIpKTsgLy8gaGVsbG8gd29ybGRcbiAqIGBgYFxuICpcbiAqIFJ1biB0aGlzIHdpdGggYGRlbm8gcnVuIC0tYWxsb3ctcmVhZCAtLWFsbG93LWVudiBhcHAudHNgLlxuICpcbiAqICMjIEZpbGVzXG4gKiBEb3RlbnYgc3VwcG9ydHMgYSBudW1iZXIgb2YgZGlmZmVyZW50IGZpbGVzLCBhbGwgb2Ygd2hpY2ggYXJlIG9wdGlvbmFsLlxuICogRmlsZSBuYW1lcyBhbmQgcGF0aHMgYXJlIGNvbmZpZ3VyYWJsZS5cbiAqXG4gKiB8RmlsZXxQdXJwb3NlfFxuICogfC0tLS18LS0tLS0tLXxcbiAqIHwuZW52fHByaW1hcnkgZmlsZSBmb3Igc3RvcmluZyBrZXktdmFsdWUgZW52aXJvbm1lbnQgZW50cmllc1xuICogfC5lbnYuZXhhbXBsZXx0aGlzIGZpbGUgZG9lcyBub3Qgc2V0IGFueSB2YWx1ZXMsIGJ1dCBzcGVjaWZpZXMgZW52IHZhcmlhYmxlcyB3aGljaCBtdXN0IGJlIHByZXNlbnQgaW4gdGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IG9yIHByb2Nlc3MgZW52aXJvbm1lbnQgYWZ0ZXIgbG9hZGluZyBkb3RlbnZcbiAqIHwuZW52LmRlZmF1bHRzfHNwZWNpZnkgZGVmYXVsdCB2YWx1ZXMgZm9yIGVudiB2YXJpYWJsZXMgdG8gYmUgdXNlZCB3aGVuIHRoZXJlIGlzIG5vIGVudHJ5IGluIHRoZSBgLmVudmAgZmlsZVxuICpcbiAqICMjIyBFeGFtcGxlIGZpbGVcbiAqXG4gKiBUaGUgcHVycG9zZSBvZiB0aGUgZXhhbXBsZSBmaWxlIGlzIHRvIHByb3ZpZGUgYSBsaXN0IG9mIGVudmlyb25tZW50XG4gKiB2YXJpYWJsZXMgd2hpY2ggbXVzdCBiZSBzZXQgb3IgYWxyZWFkeSBwcmVzZW50IGluIHRoZSBwcm9jZXNzIGVudmlyb25tZW50XG4gKiBvciBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uICBUaGVzZVxuICogdmFyaWFibGVzIG1heSBiZSBzZXQgZXh0ZXJuYWxseSBvciBsb2FkZWQgdmlhIHRoZSBgLmVudmAgb3JcbiAqIGAuZW52LmRlZmF1bHRzYCBmaWxlcy4gIEEgZGVzY3JpcHRpb24gbWF5IGFsc28gYmUgcHJvdmlkZWQgdG8gaGVscFxuICogdW5kZXJzdGFuZCB0aGUgcHVycG9zZSBvZiB0aGUgZW52IHZhcmlhYmxlLiBUaGUgdmFsdWVzIGluIHRoaXMgZmlsZVxuICogYXJlIGZvciBkb2N1bWVudGF0aW9uIG9ubHkgYW5kIGFyZSBub3Qgc2V0IGluIHRoZSBlbnZpcm9ubWVudC4gRXhhbXBsZTpcbiAqXG4gKiBgYGBzaFxuICogIyAuZW52LmV4YW1wbGVcbiAqXG4gKiAjIFdpdGggb3B0aW9uYWwgZGVzY3JpcHRpb24gKHRoaXMgaXMgbm90IHNldCBpbiB0aGUgZW52aXJvbm1lbnQpXG4gKiBEQVRBX0tFWT1BUEkga2V5IGZvciB0aGUgYXBpLmRhdGEuY29tIHNlcnZpY2UuXG4gKlxuICogIyBXaXRob3V0IGRlc2NyaXB0aW9uXG4gKiBEQVRBX1VSTD1cbiAqIGBgYFxuICpcbiAqIFdoZW4gdGhlIGFib3ZlIGZpbGUgaXMgcHJlc2VudCwgYWZ0ZXIgZG90ZW52IGlzIGxvYWRlZCwgaWYgZWl0aGVyXG4gKiBEQVRBX0tFWSBvciBEQVRBX1VSTCBpcyBub3QgcHJlc2VudCBpbiB0aGUgZW52aXJvbm1lbnQgYW4gZXhjZXB0aW9uXG4gKiBpcyB0aHJvd24uXG4gKlxuICogIyMjIERlZmF1bHRzXG4gKlxuICogVGhpcyBmaWxlIGlzIHVzZWQgdG8gcHJvdmlkZSBhIGxpc3Qgb2YgZGVmYXVsdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIHdoaWNoIHdpbGwgYmUgdXNlZCBpZiB0aGVyZSBpcyBubyBvdmVycmlkaW5nIHZhcmlhYmxlIGluIHRoZSBgLmVudmBcbiAqIGZpbGUuXG4gKlxuICogYGBgc2hcbiAqICMgLmVudi5kZWZhdWx0c1xuICogS0VZXzE9REVGQVVMVF9WQUxVRVxuICogS0VZXzI9QU5PVEhFUl9ERUZBVUxUX1ZBTFVFXG4gKiBgYGBcbiAqIGBgYHNoXG4gKiAjIC5lbnZcbiAqIEtFWV8xPUFCQ0RcbiAqIGBgYFxuICogVGhlIGVudmlyb25tZW50IHZhcmlhYmxlcyBzZXQgYWZ0ZXIgZG90ZW52IGxvYWRzIGFyZTpcbiAqIGBgYHNoXG4gKiBLRVlfMT1BQkNEXG4gKiBLRVlfMj1BTk9USEVSX0RFRkFVTFRfVkFMVUVcbiAqIGBgYFxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiBMb2FkaW5nIGVudmlyb25tZW50IGZpbGVzIGNvbWVzIHdpdGggYSBudW1iZXIgb2Ygb3B0aW9ucyBwYXNzZWQgaW50b1xuICogdGhlIGBsb2FkKClgIGZ1bmN0aW9uLCBhbGwgb2Ygd2hpY2ggYXJlIG9wdGlvbmFsLlxuICpcbiAqIHxPcHRpb258RGVmYXVsdHxEZXNjcmlwdGlvblxuICogfC0tLS0tLXwtLS0tLS0tfC0tLS0tLS0tLS0tXG4gKiB8ZW52UGF0aHwuLy5lbnZ8UGF0aCBhbmQgZmlsZW5hbWUgb2YgdGhlIGAuZW52YCBmaWxlLiAgVXNlIG51bGwgdG8gcHJldmVudCB0aGUgLmVudiBmaWxlIGZyb20gYmVpbmcgbG9hZGVkLlxuICogfGRlZmF1bHRzUGF0aHwuLy5lbnYuZGVmYXVsdHN8UGF0aCBhbmQgZmlsZW5hbWUgb2YgdGhlIGAuZW52LmRlZmF1bHRzYCBmaWxlLiBVc2UgbnVsbCB0byBwcmV2ZW50IHRoZSAuZW52LmRlZmF1bHRzIGZpbGUgZnJvbSBiZWluZyBsb2FkZWQuXG4gKiB8ZXhhbXBsZVBhdGh8Li8uZW52LmV4YW1wbGV8UGF0aCBhbmQgZmlsZW5hbWUgb2YgdGhlIGAuZW52LmV4YW1wbGVgIGZpbGUuIFVzZSBudWxsIHRvIHByZXZlbnQgdGhlIC5lbnYuZXhhbXBsZSBmaWxlIGZyb20gYmVpbmcgbG9hZGVkLlxuICogfGV4cG9ydHxmYWxzZXxXaGVuIHRydWUsIHRoaXMgd2lsbCBleHBvcnQgYWxsIGVudmlyb25tZW50IHZhcmlhYmxlcyBpbiB0aGUgYC5lbnZgIGFuZCBgLmVudi5kZWZhdWx0YCBmaWxlcyB0byB0aGUgcHJvY2VzcyBlbnZpcm9ubWVudCAoZS5nLiBmb3IgdXNlIGJ5IGBEZW5vLmVudi5nZXQoKWApIGJ1dCBvbmx5IGlmIHRoZXkgYXJlIG5vdCBhbHJlYWR5IHNldC4gIElmIGEgdmFyaWFibGUgaXMgYWxyZWFkeSBpbiB0aGUgcHJvY2VzcywgdGhlIGAuZW52YCB2YWx1ZSBpcyBpZ25vcmVkLlxuICogfGFsbG93RW1wdHlWYWx1ZXN8ZmFsc2V8QWxsb3dzIGVtcHR5IHZhbHVlcyBmb3Igc3BlY2lmaWVkIGVudiB2YXJpYWJsZXMgKHRocm93cyBvdGhlcndpc2UpXG4gKlxuICogIyMjIEV4YW1wbGUgY29uZmlndXJhdGlvblxuICogYGBgdHNcbiAqIGltcG9ydCB7IGxvYWQgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9kb3RlbnYvbW9kLnRzXCI7XG4gKlxuICogY29uc3QgY29uZiA9IGF3YWl0IGxvYWQoe1xuICogICAgIGVudlBhdGg6IFwiLi8uZW52X3Byb2RcIixcbiAqICAgICBleGFtcGxlUGF0aDogXCIuLy5lbnZfcmVxdWlyZWRcIixcbiAqICAgICBleHBvcnQ6IHRydWUsXG4gKiAgICAgYWxsb3dFbXB0eVZhbHVlczogdHJ1ZSxcbiAqICAgfSk7XG4gKiBgYGBcbiAqXG4gKiAjIyBQZXJtaXNzaW9uc1xuICpcbiAqIEF0IGEgbWluaW11bSwgbG9hZGluZyB0aGUgYC5lbnZgIHJlbGF0ZWQgZmlsZXMgcmVxdWlyZXMgdGhlIGAtLWFsbG93LXJlYWRgIHBlcm1pc3Npb24uICBBZGRpdGlvbmFsbHksIGlmXG4gKiB5b3UgYWNjZXNzIHRoZSBwcm9jZXNzIGVudmlyb25tZW50LCBlaXRoZXIgdGhyb3VnaCBleHBvcnRpbmcgeW91ciBjb25maWd1cmF0aW9uIG9yIGV4cGFuZGluZyB2YXJpYWJsZXNcbiAqIGluIHlvdXIgYC5lbnZgIGZpbGUsIHlvdSB3aWxsIG5lZWQgdGhlIGAtLWFsbG93LWVudmAgcGVybWlzc2lvbi4gIEUuZy5cbiAqXG4gKiBgYGBzaFxuICogZGVubyBydW4gLS1hbGxvdy1yZWFkPS5lbnYsLmVudi5kZWZhdWx0cywuZW52LmV4YW1wbGUgLS1hbGxvdy1lbnY9RU5WMSxFTlYyIGFwcC50c1xuICogYGBgXG4gKlxuICogIyMgUGFyc2luZyBSdWxlc1xuICpcbiAqIFRoZSBwYXJzaW5nIGVuZ2luZSBjdXJyZW50bHkgc3VwcG9ydHMgdGhlIGZvbGxvd2luZyBydWxlczpcbiAqXG4gKiAtIFZhcmlhYmxlcyB0aGF0IGFscmVhZHkgZXhpc3QgaW4gdGhlIGVudmlyb25tZW50IGFyZSBub3Qgb3ZlcnJpZGRlbiB3aXRoXG4gKiAgIGBleHBvcnQ6IHRydWVgXG4gKiAtIGBCQVNJQz1iYXNpY2AgYmVjb21lcyBgeyBCQVNJQzogXCJiYXNpY1wiIH1gXG4gKiAtIGVtcHR5IGxpbmVzIGFyZSBza2lwcGVkXG4gKiAtIGxpbmVzIGJlZ2lubmluZyB3aXRoIGAjYCBhcmUgdHJlYXRlZCBhcyBjb21tZW50c1xuICogLSBlbXB0eSB2YWx1ZXMgYmVjb21lIGVtcHR5IHN0cmluZ3MgKGBFTVBUWT1gIGJlY29tZXMgYHsgRU1QVFk6IFwiXCIgfWApXG4gKiAtIHNpbmdsZSBhbmQgZG91YmxlIHF1b3RlZCB2YWx1ZXMgYXJlIGVzY2FwZWQgKGBTSU5HTEVfUVVPVEU9J3F1b3RlZCdgIGJlY29tZXNcbiAqICAgYHsgU0lOR0xFX1FVT1RFOiBcInF1b3RlZFwiIH1gKVxuICogLSBuZXcgbGluZXMgYXJlIGV4cGFuZGVkIGluIGRvdWJsZSBxdW90ZWQgdmFsdWVzIChgTVVMVElMSU5FPVwibmV3XFxubGluZVwiYFxuICogICBiZWNvbWVzXG4gKlxuICogYGBgXG4gKiB7IE1VTFRJTElORTogXCJuZXdcXG5saW5lXCIgfVxuICogYGBgXG4gKlxuICogLSBpbm5lciBxdW90ZXMgYXJlIG1haW50YWluZWQgKHRoaW5rIEpTT04pIChgSlNPTj17XCJmb29cIjogXCJiYXJcIn1gIGJlY29tZXNcbiAqICAgYHsgSlNPTjogXCJ7XFxcImZvb1xcXCI6IFxcXCJiYXJcXFwifVwiIH1gKVxuICogLSB3aGl0ZXNwYWNlIGlzIHJlbW92ZWQgZnJvbSBib3RoIGVuZHMgb2YgdW5xdW90ZWQgdmFsdWVzIChzZWUgbW9yZSBvblxuICogICB7QGxpbmtjb2RlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL1N0cmluZy9UcmltIHwgdHJpbX0pXG4gKiAgIChgRk9PPSBzb21lIHZhbHVlYCBiZWNvbWVzIGB7IEZPTzogXCJzb21lIHZhbHVlXCIgfWApXG4gKiAtIHdoaXRlc3BhY2UgaXMgcHJlc2VydmVkIG9uIGJvdGggZW5kcyBvZiBxdW90ZWQgdmFsdWVzIChgRk9PPVwiIHNvbWUgdmFsdWUgXCJgXG4gKiAgIGJlY29tZXMgYHsgRk9POiBcIiBzb21lIHZhbHVlIFwiIH1gKVxuICogLSBkb2xsYXIgc2lnbiB3aXRoIGFuIGVudmlyb25tZW50IGtleSBpbiBvciB3aXRob3V0IGN1cmx5IGJyYWNlcyBpbiB1bnF1b3RlZFxuICogICB2YWx1ZXMgd2lsbCBleHBhbmQgdGhlIGVudmlyb25tZW50IGtleSAoYEtFWT0kS0VZYCBvciBgS0VZPSR7S0VZfWAgYmVjb21lc1xuICogICBgeyBLRVk6IFwiPEtFWV9WQUxVRV9GUk9NX0VOVj5cIiB9YClcbiAqIC0gZXNjYXBlZCBkb2xsYXIgc2lnbiB3aXRoIGFuIGVudmlyb25tZW50IGtleSBpbiB1bnF1b3RlZCB2YWx1ZXMgd2lsbCBlc2NhcGUgdGhlXG4gKiAgIGVudmlyb25tZW50IGtleSByYXRoZXIgdGhhbiBleHBhbmQgKGBLRVk9XFwkS0VZYCBiZWNvbWVzIGB7IEtFWTogXCJcXFxcJEtFWVwiIH1gKVxuICogLSBjb2xvbiBhbmQgYSBtaW51cyBzaWduIHdpdGggYSBkZWZhdWx0IHZhbHVlKHdoaWNoIGNhbiBhbHNvIGJlIGFub3RoZXIgZXhwYW5kXG4gKiAgIHZhbHVlKSBpbiBleHBhbmRpbmcgY29uc3RydWN0aW9uIGluIHVucXVvdGVkIHZhbHVlcyB3aWxsIGZpcnN0IGF0dGVtcHQgdG9cbiAqICAgZXhwYW5kIHRoZSBlbnZpcm9ubWVudCBrZXkuIElmIGl04oCZcyBub3QgZm91bmQsIHRoZW4gaXQgd2lsbCByZXR1cm4gdGhlIGRlZmF1bHRcbiAqICAgdmFsdWUgKGBLRVk9JHtLRVk6LWRlZmF1bHR9YCBJZiBLRVkgZXhpc3RzIGl0IGJlY29tZXNcbiAqICAgYHsgS0VZOiBcIjxLRVlfVkFMVUVfRlJPTV9FTlY+XCIgfWAgSWYgbm90LCB0aGVuIGl0IGJlY29tZXNcbiAqICAgYHsgS0VZOiBcImRlZmF1bHRcIiB9YC4gQWxzbyB0aGVyZSBpcyBwb3NzaWJsZSB0byBkbyB0aGlzIGNhc2VcbiAqICAgYEtFWT0ke05PX1NVQ0hfS0VZOi0ke0VYSVNUSU5HX0tFWTotZGVmYXVsdH19YCB3aGljaCBiZWNvbWVzXG4gKiAgIGB7IEtFWTogXCI8RVhJU1RJTkdfS0VZX1ZBTFVFX0ZST01fRU5WPlwiIH1gKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZChcbiAge1xuICAgIGVudlBhdGggPSBcIi5lbnZcIixcbiAgICBleGFtcGxlUGF0aCA9IFwiLmVudi5leGFtcGxlXCIsXG4gICAgZGVmYXVsdHNQYXRoID0gXCIuZW52LmRlZmF1bHRzXCIsXG4gICAgZXhwb3J0OiBfZXhwb3J0ID0gZmFsc2UsXG4gICAgYWxsb3dFbXB0eVZhbHVlcyA9IGZhbHNlLFxuICB9OiBMb2FkT3B0aW9ucyA9IHt9LFxuKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiB7XG4gIGNvbnN0IGNvbmYgPSBlbnZQYXRoID8gYXdhaXQgcGFyc2VGaWxlKGVudlBhdGgpIDoge307XG5cbiAgaWYgKGRlZmF1bHRzUGF0aCkge1xuICAgIGNvbnN0IGNvbmZEZWZhdWx0cyA9IGF3YWl0IHBhcnNlRmlsZShkZWZhdWx0c1BhdGgpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGNvbmZEZWZhdWx0cykpIHtcbiAgICAgIGlmICghKGtleSBpbiBjb25mKSkge1xuICAgICAgICBjb25mW2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZXhhbXBsZVBhdGgpIHtcbiAgICBjb25zdCBjb25mRXhhbXBsZSA9IGF3YWl0IHBhcnNlRmlsZShleGFtcGxlUGF0aCk7XG4gICAgYXNzZXJ0U2FmZShjb25mLCBjb25mRXhhbXBsZSwgYWxsb3dFbXB0eVZhbHVlcyk7XG4gIH1cblxuICBpZiAoX2V4cG9ydCkge1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGNvbmYpKSB7XG4gICAgICBpZiAoRGVuby5lbnYuZ2V0KGtleSkgIT09IHVuZGVmaW5lZCkgY29udGludWU7XG4gICAgICBEZW5vLmVudi5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNvbmY7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRmlsZVN5bmMoXG4gIGZpbGVwYXRoOiBzdHJpbmcsXG4pOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcGFyc2UoRGVuby5yZWFkVGV4dEZpbGVTeW5jKGZpbGVwYXRoKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSByZXR1cm4ge307XG4gICAgdGhyb3cgZTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYXJzZUZpbGUoXG4gIGZpbGVwYXRoOiBzdHJpbmcsXG4pOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHN0cmluZz4+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcGFyc2UoYXdhaXQgRGVuby5yZWFkVGV4dEZpbGUoZmlsZXBhdGgpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuTm90Rm91bmQpIHJldHVybiB7fTtcbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydFNhZmUoXG4gIGNvbmY6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gIGNvbmZFeGFtcGxlOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICBhbGxvd0VtcHR5VmFsdWVzOiBib29sZWFuLFxuKSB7XG4gIGNvbnN0IG1pc3NpbmdFbnZWYXJzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3Qga2V5IGluIGNvbmZFeGFtcGxlKSB7XG4gICAgaWYgKGtleSBpbiBjb25mKSB7XG4gICAgICBpZiAoIWFsbG93RW1wdHlWYWx1ZXMgJiYgY29uZltrZXldID09PSBcIlwiKSB7XG4gICAgICAgIG1pc3NpbmdFbnZWYXJzLnB1c2goa2V5KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKERlbm8uZW52LmdldChrZXkpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghYWxsb3dFbXB0eVZhbHVlcyAmJiBEZW5vLmVudi5nZXQoa2V5KSA9PT0gXCJcIikge1xuICAgICAgICBtaXNzaW5nRW52VmFycy5wdXNoKGtleSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG1pc3NpbmdFbnZWYXJzLnB1c2goa2V5KTtcbiAgICB9XG4gIH1cblxuICBpZiAobWlzc2luZ0VudlZhcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGVycm9yTWVzc2FnZXMgPSBbXG4gICAgICBgVGhlIGZvbGxvd2luZyB2YXJpYWJsZXMgd2VyZSBkZWZpbmVkIGluIHRoZSBleGFtcGxlIGZpbGUgYnV0IGFyZSBub3QgcHJlc2VudCBpbiB0aGUgZW52aXJvbm1lbnQ6XFxuICAke1xuICAgICAgICBtaXNzaW5nRW52VmFycy5qb2luKFxuICAgICAgICAgIFwiLCBcIixcbiAgICAgICAgKVxuICAgICAgfWAsXG4gICAgICBgTWFrZSBzdXJlIHRvIGFkZCB0aGVtIHRvIHlvdXIgZW52IGZpbGUuYCxcbiAgICAgICFhbGxvd0VtcHR5VmFsdWVzICYmXG4gICAgICBgSWYgeW91IGV4cGVjdCBhbnkgb2YgdGhlc2UgdmFyaWFibGVzIHRvIGJlIGVtcHR5LCB5b3UgY2FuIHNldCB0aGUgYWxsb3dFbXB0eVZhbHVlcyBvcHRpb24gdG8gdHJ1ZS5gLFxuICAgIF07XG5cbiAgICB0aHJvdyBuZXcgTWlzc2luZ0VudlZhcnNFcnJvcihcbiAgICAgIGVycm9yTWVzc2FnZXMuZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCJcXG5cXG5cIiksXG4gICAgICBtaXNzaW5nRW52VmFycyxcbiAgICApO1xuICB9XG59XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIGluIHtAbGlua2NvZGUgbG9hZH0gYW5kIHtAbGlua2NvZGUgbG9hZFN5bmN9IHdoZW4gcmVxdWlyZWRcbiAqIGVudmlyb25tZW50IHZhcmlhYmxlcyBhcmUgbWlzc2luZy5cbiAqL1xuZXhwb3J0IGNsYXNzIE1pc3NpbmdFbnZWYXJzRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKiBUaGUga2V5cyBvZiB0aGUgbWlzc2luZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuICovXG4gIG1pc3Npbmc6IHN0cmluZ1tdO1xuICAvKiogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZS4gKi9cbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nLCBtaXNzaW5nOiBzdHJpbmdbXSkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9IFwiTWlzc2luZ0VudlZhcnNFcnJvclwiO1xuICAgIHRoaXMubWlzc2luZyA9IG1pc3Npbmc7XG4gICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsIG5ldy50YXJnZXQucHJvdG90eXBlKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUUxRTs7Ozs7Q0FLQyxHQUVELFNBQVMsS0FBSyxRQUFRLGFBQWE7QUFFbkMsY0FBYyxpQkFBaUI7QUFDL0IsY0FBYyxhQUFhO0FBb0QzQiw4REFBOEQsR0FDOUQsT0FBTyxTQUFTLFNBQ2QsRUFDRSxVQUFVLE1BQU0sRUFDaEIsY0FBYyxjQUFjLEVBQzVCLGVBQWUsZUFBZSxFQUM5QixRQUFRLFVBQVUsS0FBSyxFQUN2QixtQkFBbUIsS0FBSyxFQUNaLEdBQUcsQ0FBQyxDQUFDO0VBRW5CLE1BQU0sT0FBTyxVQUFVLGNBQWMsV0FBVyxDQUFDO0VBRWpELElBQUksY0FBYztJQUNoQixNQUFNLGVBQWUsY0FBYztJQUNuQyxLQUFLLE1BQU0sQ0FBQyxLQUFLLE1BQU0sSUFBSSxPQUFPLE9BQU8sQ0FBQyxjQUFlO01BQ3ZELElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxHQUFHO1FBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUc7TUFDZDtJQUNGO0VBQ0Y7RUFFQSxJQUFJLGFBQWE7SUFDZixNQUFNLGNBQWMsY0FBYztJQUNsQyxXQUFXLE1BQU0sYUFBYTtFQUNoQztFQUVBLElBQUksU0FBUztJQUNYLEtBQUssTUFBTSxDQUFDLEtBQUssTUFBTSxJQUFJLE9BQU8sT0FBTyxDQUFDLE1BQU87TUFDL0MsSUFBSSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxXQUFX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
// denoCacheMetadata=3482319094168709645,14718972950006618434