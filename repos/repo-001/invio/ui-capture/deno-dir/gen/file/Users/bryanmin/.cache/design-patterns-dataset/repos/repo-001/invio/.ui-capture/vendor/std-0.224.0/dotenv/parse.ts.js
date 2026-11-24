// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
const RE_KEY_VALUE = /^\s*(?:export\s+)?(?<key>[a-zA-Z_]+[a-zA-Z0-9_]*?)\s*=[\ \t]*('\n?(?<notInterpolated>(.|\n)*?)\n?'|"\n?(?<interpolated>(.|\n)*?)\n?"|(?<unquoted>[^\n#]*)) *#*.*$/gm;
const RE_EXPAND_VALUE = /(\${(?<inBrackets>.+?)(\:-(?<inBracketsDefault>.+))?}|(?<!\\)\$(?<notInBrackets>\w+)(\:-(?<notInBracketsDefault>.+))?)/g;
function expandCharacters(str) {
  const charactersMap = {
    "\\n": "\n",
    "\\r": "\r",
    "\\t": "\t"
  };
  return str.replace(/\\([nrt])/g, ($1)=>charactersMap[$1] || "");
}
function expand(str, variablesMap) {
  if (RE_EXPAND_VALUE.test(str)) {
    return expand(str.replace(RE_EXPAND_VALUE, function(...params) {
      const { inBrackets, inBracketsDefault, notInBrackets, notInBracketsDefault } = params[params.length - 1];
      const expandValue = inBrackets || notInBrackets;
      const defaultValue = inBracketsDefault || notInBracketsDefault;
      let value = variablesMap[expandValue];
      if (value === undefined) {
        value = Deno.env.get(expandValue);
      }
      return value === undefined ? expand(defaultValue, variablesMap) : value;
    }), variablesMap);
  } else {
    return str;
  }
}
/**
 * Parse `.env` file output in an object.
 *
 * @example
 * ```ts
 * import { parse } from "https://deno.land/std@$STD_VERSION/dotenv/parse.ts";
 *
 * const env = parse("GREETING=hello world");
 * env.GREETING; // "hello world"
 * ```
 */ export function parse(rawDotenv) {
  const env = {};
  let match;
  const keysForExpandCheck = [];
  while((match = RE_KEY_VALUE.exec(rawDotenv)) !== null){
    const { key, interpolated, notInterpolated, unquoted } = match?.groups;
    if (unquoted) {
      keysForExpandCheck.push(key);
    }
    env[key] = typeof notInterpolated === "string" ? notInterpolated : typeof interpolated === "string" ? expandCharacters(interpolated) : unquoted.trim();
  }
  //https://github.com/motdotla/dotenv-expand/blob/ed5fea5bf517a09fd743ce2c63150e88c8a5f6d1/lib/main.js#L23
  const variablesMap = {
    ...env
  };
  keysForExpandCheck.forEach((key)=>{
    env[key] = expand(env[key], variablesMap);
  });
  return env;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zdGQtMC4yMjQuMC9kb3RlbnYvcGFyc2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxudHlwZSBMaW5lUGFyc2VSZXN1bHQgPSB7XG4gIGtleTogc3RyaW5nO1xuICB1bnF1b3RlZDogc3RyaW5nO1xuICBpbnRlcnBvbGF0ZWQ6IHN0cmluZztcbiAgbm90SW50ZXJwb2xhdGVkOiBzdHJpbmc7XG59O1xuXG50eXBlIENoYXJhY3RlcnNNYXAgPSB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xuXG5jb25zdCBSRV9LRVlfVkFMVUUgPVxuICAvXlxccyooPzpleHBvcnRcXHMrKT8oPzxrZXk+W2EtekEtWl9dK1thLXpBLVowLTlfXSo/KVxccyo9W1xcIFxcdF0qKCdcXG4/KD88bm90SW50ZXJwb2xhdGVkPigufFxcbikqPylcXG4/J3xcIlxcbj8oPzxpbnRlcnBvbGF0ZWQ+KC58XFxuKSo/KVxcbj9cInwoPzx1bnF1b3RlZD5bXlxcbiNdKikpICojKi4qJC9nbTtcblxuY29uc3QgUkVfRVhQQU5EX1ZBTFVFID1cbiAgLyhcXCR7KD88aW5CcmFja2V0cz4uKz8pKFxcOi0oPzxpbkJyYWNrZXRzRGVmYXVsdD4uKykpP318KD88IVxcXFwpXFwkKD88bm90SW5CcmFja2V0cz5cXHcrKShcXDotKD88bm90SW5CcmFja2V0c0RlZmF1bHQ+LispKT8pL2c7XG5cbmZ1bmN0aW9uIGV4cGFuZENoYXJhY3RlcnMoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjaGFyYWN0ZXJzTWFwOiBDaGFyYWN0ZXJzTWFwID0ge1xuICAgIFwiXFxcXG5cIjogXCJcXG5cIixcbiAgICBcIlxcXFxyXCI6IFwiXFxyXCIsXG4gICAgXCJcXFxcdFwiOiBcIlxcdFwiLFxuICB9O1xuXG4gIHJldHVybiBzdHIucmVwbGFjZShcbiAgICAvXFxcXChbbnJ0XSkvZyxcbiAgICAoJDE6IGtleW9mIENoYXJhY3RlcnNNYXApOiBzdHJpbmcgPT4gY2hhcmFjdGVyc01hcFskMV0gfHwgXCJcIixcbiAgKTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kKHN0cjogc3RyaW5nLCB2YXJpYWJsZXNNYXA6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0pOiBzdHJpbmcge1xuICBpZiAoUkVfRVhQQU5EX1ZBTFVFLnRlc3Qoc3RyKSkge1xuICAgIHJldHVybiBleHBhbmQoXG4gICAgICBzdHIucmVwbGFjZShSRV9FWFBBTkRfVkFMVUUsIGZ1bmN0aW9uICguLi5wYXJhbXMpIHtcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGluQnJhY2tldHMsXG4gICAgICAgICAgaW5CcmFja2V0c0RlZmF1bHQsXG4gICAgICAgICAgbm90SW5CcmFja2V0cyxcbiAgICAgICAgICBub3RJbkJyYWNrZXRzRGVmYXVsdCxcbiAgICAgICAgfSA9IHBhcmFtc1twYXJhbXMubGVuZ3RoIC0gMV07XG4gICAgICAgIGNvbnN0IGV4cGFuZFZhbHVlID0gaW5CcmFja2V0cyB8fCBub3RJbkJyYWNrZXRzO1xuICAgICAgICBjb25zdCBkZWZhdWx0VmFsdWUgPSBpbkJyYWNrZXRzRGVmYXVsdCB8fCBub3RJbkJyYWNrZXRzRGVmYXVsdDtcblxuICAgICAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHZhcmlhYmxlc01hcFtleHBhbmRWYWx1ZV07XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFsdWUgPSBEZW5vLmVudi5nZXQoZXhwYW5kVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gZXhwYW5kKGRlZmF1bHRWYWx1ZSwgdmFyaWFibGVzTWFwKSA6IHZhbHVlO1xuICAgICAgfSksXG4gICAgICB2YXJpYWJsZXNNYXAsXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cbi8qKlxuICogUGFyc2UgYC5lbnZgIGZpbGUgb3V0cHV0IGluIGFuIG9iamVjdC5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IHBhcnNlIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vZG90ZW52L3BhcnNlLnRzXCI7XG4gKlxuICogY29uc3QgZW52ID0gcGFyc2UoXCJHUkVFVElORz1oZWxsbyB3b3JsZFwiKTtcbiAqIGVudi5HUkVFVElORzsgLy8gXCJoZWxsbyB3b3JsZFwiXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHJhd0RvdGVudjogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gIGNvbnN0IGVudjogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXG4gIGxldCBtYXRjaDtcbiAgY29uc3Qga2V5c0ZvckV4cGFuZENoZWNrID0gW107XG5cbiAgd2hpbGUgKChtYXRjaCA9IFJFX0tFWV9WQUxVRS5leGVjKHJhd0RvdGVudikpICE9PSBudWxsKSB7XG4gICAgY29uc3QgeyBrZXksIGludGVycG9sYXRlZCwgbm90SW50ZXJwb2xhdGVkLCB1bnF1b3RlZCB9ID0gbWF0Y2hcbiAgICAgID8uZ3JvdXBzIGFzIExpbmVQYXJzZVJlc3VsdDtcblxuICAgIGlmICh1bnF1b3RlZCkge1xuICAgICAga2V5c0ZvckV4cGFuZENoZWNrLnB1c2goa2V5KTtcbiAgICB9XG5cbiAgICBlbnZba2V5XSA9IHR5cGVvZiBub3RJbnRlcnBvbGF0ZWQgPT09IFwic3RyaW5nXCJcbiAgICAgID8gbm90SW50ZXJwb2xhdGVkXG4gICAgICA6IHR5cGVvZiBpbnRlcnBvbGF0ZWQgPT09IFwic3RyaW5nXCJcbiAgICAgID8gZXhwYW5kQ2hhcmFjdGVycyhpbnRlcnBvbGF0ZWQpXG4gICAgICA6IHVucXVvdGVkLnRyaW0oKTtcbiAgfVxuXG4gIC8vaHR0cHM6Ly9naXRodWIuY29tL21vdGRvdGxhL2RvdGVudi1leHBhbmQvYmxvYi9lZDVmZWE1YmY1MTdhMDlmZDc0M2NlMmM2MzE1MGU4OGM4YTVmNmQxL2xpYi9tYWluLmpzI0wyM1xuICBjb25zdCB2YXJpYWJsZXNNYXAgPSB7IC4uLmVudiB9O1xuICBrZXlzRm9yRXhwYW5kQ2hlY2suZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgZW52W2tleV0gPSBleHBhbmQoZW52W2tleV0hLCB2YXJpYWJsZXNNYXApO1xuICB9KTtcblxuICByZXR1cm4gZW52O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQVcxRSxNQUFNLGVBQ0o7QUFFRixNQUFNLGtCQUNKO0FBRUYsU0FBUyxpQkFBaUIsR0FBVztFQUNuQyxNQUFNLGdCQUErQjtJQUNuQyxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87RUFDVDtFQUVBLE9BQU8sSUFBSSxPQUFPLENBQ2hCLGNBQ0EsQ0FBQyxLQUFvQyxhQUFhLENBQUMsR0FBRyxJQUFJO0FBRTlEO0FBRUEsU0FBUyxPQUFPLEdBQVcsRUFBRSxZQUF1QztFQUNsRSxJQUFJLGdCQUFnQixJQUFJLENBQUMsTUFBTTtJQUM3QixPQUFPLE9BQ0wsSUFBSSxPQUFPLENBQUMsaUJBQWlCLFNBQVUsR0FBRyxNQUFNO01BQzlDLE1BQU0sRUFDSixVQUFVLEVBQ1YsaUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixvQkFBb0IsRUFDckIsR0FBRyxNQUFNLENBQUMsT0FBTyxNQUFNLEdBQUcsRUFBRTtNQUM3QixNQUFNLGNBQWMsY0FBYztNQUNsQyxNQUFNLGVBQWUscUJBQXFCO01BRTFDLElBQUksUUFBNEIsWUFBWSxDQUFDLFlBQVk7TUFDekQsSUFBSSxVQUFVLFdBQVc7UUFDdkIsUUFBUSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUM7TUFDdkI7TUFDQSxPQUFPLFVBQVUsWUFBWSxPQUFPLGNBQWMsZ0JBQWdCO0lBQ3BFLElBQ0E7RUFFSixPQUFPO0lBQ0wsT0FBTztFQUNUO0FBQ0Y7QUFFQTs7Ozs7Ozs7OztDQVVDLEdBQ0QsT0FBTyxTQUFTLE1BQU0sU0FBaUI7RUFDckMsTUFBTSxNQUE4QixDQUFDO0VBRXJDLElBQUk7RUFDSixNQUFNLHFCQUFxQixFQUFFO0VBRTdCLE1BQU8sQ0FBQyxRQUFRLGFBQWEsSUFBSSxDQUFDLFVBQVUsTUFBTSxLQUFNO0lBQ3RELE1BQU0sRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUNyRDtJQUVKLElBQUksVUFBVTtNQUNaLG1CQUFtQixJQUFJLENBQUM7SUFDMUI7SUFFQSxHQUFHLENBQUMsSUFBSSxHQUFHLE9BQU8sb0JBQW9CLFdBQ2xDLGtCQUNBLE9BQU8saUJBQWlCLFdBQ3hCLGlCQUFpQixnQkFDakIsU0FBUyxJQUFJO0VBQ25CO0VBRUEseUdBQXlHO0VBQ3pHLE1BQU0sZUFBZTtJQUFFLEdBQUcsR0FBRztFQUFDO0VBQzlCLG1CQUFtQixPQUFPLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsSUFBSSxHQUFHLE9BQU8sR0FBRyxDQUFDLElBQUksRUFBRztFQUMvQjtFQUVBLE9BQU87QUFDVCJ9
// denoCacheMetadata=10468582814226991869,8957587801277789726