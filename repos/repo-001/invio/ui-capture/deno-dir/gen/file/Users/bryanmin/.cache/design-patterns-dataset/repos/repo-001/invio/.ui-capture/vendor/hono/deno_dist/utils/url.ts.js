export const splitPath = (path)=>{
  const paths = path.split('/');
  if (paths[0] === '') {
    paths.shift();
  }
  return paths;
};
export const splitRoutingPath = (routePath)=>{
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
const extractGroupsFromPath = (path)=>{
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index)=>{
    const mark = `@${index}`;
    groups.push([
      mark,
      match
    ]);
    return mark;
  });
  return {
    groups,
    path
  };
};
const replaceGroupMarks = (paths, groups)=>{
  for(let i = groups.length - 1; i >= 0; i--){
    const [mark] = groups[i];
    for(let j = paths.length - 1; j >= 0; j--){
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
const patternCache = {};
export const getPattern = (label)=>{
  // *            => wildcard
  // :id{[0-9]+}  => ([0-9]+)
  // :id          => (.+)
  //const name = ''
  if (label === '*') {
    return '*';
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    if (!patternCache[label]) {
      if (match[2]) {
        patternCache[label] = [
          label,
          match[1],
          new RegExp('^' + match[2] + '$')
        ];
      } else {
        patternCache[label] = [
          label,
          match[1],
          true
        ];
      }
    }
    return patternCache[label];
  }
  return null;
};
export const getPath = (request)=>{
  // Optimized: RegExp is faster than indexOf() + slice()
  const match = request.url.match(/^https?:\/\/[^/]+(\/[^?]*)/);
  return match ? match[1] : '';
};
export const getQueryStrings = (url)=>{
  const queryIndex = url.indexOf('?', 8);
  return queryIndex === -1 ? '' : '?' + url.slice(queryIndex + 1);
};
export const getPathNoStrict = (request)=>{
  const result = getPath(request);
  // if strict routing is false => `/hello/hey/` and `/hello/hey` are treated the same
  return result.length > 1 && result[result.length - 1] === '/' ? result.slice(0, -1) : result;
};
export const mergePath = (...paths)=>{
  let p = '';
  let endsWithSlash = false;
  for (let path of paths){
    /* ['/hey/','/say'] => ['/hey', '/say'] */ if (p[p.length - 1] === '/') {
      p = p.slice(0, -1);
      endsWithSlash = true;
    }
    /* ['/hey','say'] => ['/hey', '/say'] */ if (path[0] !== '/') {
      path = `/${path}`;
    }
    /* ['/hey/', '/'] => `/hey/` */ if (path === '/' && endsWithSlash) {
      p = `${p}/`;
    } else if (path !== '/') {
      p = `${p}${path}`;
    }
    /* ['/', '/'] => `/` */ if (path === '/' && p === '') {
      p = '/';
    }
  }
  return p;
};
export const checkOptionalParameter = (path)=>{
  /*
   If path is `/api/animals/:type?` it will return:
   [`/api/animals`, `/api/animals/:type`]
   in other cases it will return null
  */ if (!path.match(/\:.+\?$/)) {
    return null;
  }
  const segments = path.split('/');
  const results = [];
  let basePath = '';
  segments.forEach((segment)=>{
    if (segment !== '' && !/\:/.test(segment)) {
      basePath += '/' + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === '') {
          results.push('/');
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace('?', '');
        basePath += '/' + optionalSegment;
        results.push(basePath);
      } else {
        basePath += '/' + segment;
      }
    }
  });
  return results.filter((v, i, a)=>a.indexOf(v) === i);
};
// Optimized
const _decodeURI = (value)=>{
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf('+') !== -1) {
    value = value.replace(/\+/g, ' ');
  }
  return /%/.test(value) ? decodeURIComponent_(value) : value;
};
const _getQueryParam = (url, key, multiple)=>{
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    // optimized for unencoded key
    let keyIndex = url.indexOf(`?${key}`, 8);
    if (keyIndex === -1) {
      keyIndex = url.indexOf(`&${key}`, 8);
    }
    while(keyIndex !== -1){
      const trailingKeyCode = url.charCodeAt(keyIndex + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex + key.length + 2;
        const endIndex = url.indexOf('&', valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? undefined : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return '';
      }
      keyIndex = url.indexOf(`&${key}`, keyIndex + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return undefined;
    }
  // fallback to default routine
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf('?', 8);
  while(keyIndex !== -1){
    const nextKeyIndex = url.indexOf('&', keyIndex + 1);
    let valueIndex = url.indexOf('=', keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? undefined : nextKeyIndex : valueIndex);
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === '') {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = '';
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? undefined : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
export const getQueryParam = _getQueryParam;
export const getQueryParams = (url, key)=>{
  return _getQueryParam(url, key, true);
};
// `decodeURIComponent` is a long name.
// By making it a function, we can use it commonly when minified, reducing the amount of code.
export const decodeURIComponent_ = decodeURIComponent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9ob25vL2Rlbm9fZGlzdC91dGlscy91cmwudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IHR5cGUgUGF0dGVybiA9IHJlYWRvbmx5IFtzdHJpbmcsIHN0cmluZywgUmVnRXhwIHwgdHJ1ZV0gfCAnKidcblxuZXhwb3J0IGNvbnN0IHNwbGl0UGF0aCA9IChwYXRoOiBzdHJpbmcpOiBzdHJpbmdbXSA9PiB7XG4gIGNvbnN0IHBhdGhzID0gcGF0aC5zcGxpdCgnLycpXG4gIGlmIChwYXRoc1swXSA9PT0gJycpIHtcbiAgICBwYXRocy5zaGlmdCgpXG4gIH1cbiAgcmV0dXJuIHBhdGhzXG59XG5cbmV4cG9ydCBjb25zdCBzcGxpdFJvdXRpbmdQYXRoID0gKHJvdXRlUGF0aDogc3RyaW5nKTogc3RyaW5nW10gPT4ge1xuICBjb25zdCB7IGdyb3VwcywgcGF0aCB9ID0gZXh0cmFjdEdyb3Vwc0Zyb21QYXRoKHJvdXRlUGF0aClcblxuICBjb25zdCBwYXRocyA9IHNwbGl0UGF0aChwYXRoKVxuICByZXR1cm4gcmVwbGFjZUdyb3VwTWFya3MocGF0aHMsIGdyb3Vwcylcbn1cblxuY29uc3QgZXh0cmFjdEdyb3Vwc0Zyb21QYXRoID0gKHBhdGg6IHN0cmluZyk6IHsgZ3JvdXBzOiBbc3RyaW5nLCBzdHJpbmddW107IHBhdGg6IHN0cmluZyB9ID0+IHtcbiAgY29uc3QgZ3JvdXBzOiBbc3RyaW5nLCBzdHJpbmddW10gPSBbXVxuXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xce1tefV0rXFx9L2csIChtYXRjaCwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBtYXJrID0gYEAke2luZGV4fWBcbiAgICBncm91cHMucHVzaChbbWFyaywgbWF0Y2hdKVxuICAgIHJldHVybiBtYXJrXG4gIH0pXG5cbiAgcmV0dXJuIHsgZ3JvdXBzLCBwYXRoIH1cbn1cblxuY29uc3QgcmVwbGFjZUdyb3VwTWFya3MgPSAocGF0aHM6IHN0cmluZ1tdLCBncm91cHM6IFtzdHJpbmcsIHN0cmluZ11bXSk6IHN0cmluZ1tdID0+IHtcbiAgZm9yIChsZXQgaSA9IGdyb3Vwcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGNvbnN0IFttYXJrXSA9IGdyb3Vwc1tpXVxuXG4gICAgZm9yIChsZXQgaiA9IHBhdGhzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICBpZiAocGF0aHNbal0uaW5jbHVkZXMobWFyaykpIHtcbiAgICAgICAgcGF0aHNbal0gPSBwYXRoc1tqXS5yZXBsYWNlKG1hcmssIGdyb3Vwc1tpXVsxXSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGF0aHNcbn1cblxuY29uc3QgcGF0dGVybkNhY2hlOiB7IFtrZXk6IHN0cmluZ106IFBhdHRlcm4gfSA9IHt9XG5leHBvcnQgY29uc3QgZ2V0UGF0dGVybiA9IChsYWJlbDogc3RyaW5nKTogUGF0dGVybiB8IG51bGwgPT4ge1xuICAvLyAqICAgICAgICAgICAgPT4gd2lsZGNhcmRcbiAgLy8gOmlke1swLTldK30gID0+IChbMC05XSspXG4gIC8vIDppZCAgICAgICAgICA9PiAoLispXG4gIC8vY29uc3QgbmFtZSA9ICcnXG5cbiAgaWYgKGxhYmVsID09PSAnKicpIHtcbiAgICByZXR1cm4gJyonXG4gIH1cblxuICBjb25zdCBtYXRjaCA9IGxhYmVsLm1hdGNoKC9eXFw6KFteXFx7XFx9XSspKD86XFx7KC4rKVxcfSk/JC8pXG4gIGlmIChtYXRjaCkge1xuICAgIGlmICghcGF0dGVybkNhY2hlW2xhYmVsXSkge1xuICAgICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICAgIHBhdHRlcm5DYWNoZVtsYWJlbF0gPSBbbGFiZWwsIG1hdGNoWzFdLCBuZXcgUmVnRXhwKCdeJyArIG1hdGNoWzJdICsgJyQnKV1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhdHRlcm5DYWNoZVtsYWJlbF0gPSBbbGFiZWwsIG1hdGNoWzFdLCB0cnVlXVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwYXR0ZXJuQ2FjaGVbbGFiZWxdXG4gIH1cblxuICByZXR1cm4gbnVsbFxufVxuXG5leHBvcnQgY29uc3QgZ2V0UGF0aCA9IChyZXF1ZXN0OiBSZXF1ZXN0KTogc3RyaW5nID0+IHtcbiAgLy8gT3B0aW1pemVkOiBSZWdFeHAgaXMgZmFzdGVyIHRoYW4gaW5kZXhPZigpICsgc2xpY2UoKVxuICBjb25zdCBtYXRjaCA9IHJlcXVlc3QudXJsLm1hdGNoKC9eaHR0cHM/OlxcL1xcL1teL10rKFxcL1teP10qKS8pXG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzFdIDogJydcbn1cblxuZXhwb3J0IGNvbnN0IGdldFF1ZXJ5U3RyaW5ncyA9ICh1cmw6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gIGNvbnN0IHF1ZXJ5SW5kZXggPSB1cmwuaW5kZXhPZignPycsIDgpXG4gIHJldHVybiBxdWVyeUluZGV4ID09PSAtMSA/ICcnIDogJz8nICsgdXJsLnNsaWNlKHF1ZXJ5SW5kZXggKyAxKVxufVxuXG5leHBvcnQgY29uc3QgZ2V0UGF0aE5vU3RyaWN0ID0gKHJlcXVlc3Q6IFJlcXVlc3QpOiBzdHJpbmcgPT4ge1xuICBjb25zdCByZXN1bHQgPSBnZXRQYXRoKHJlcXVlc3QpXG5cbiAgLy8gaWYgc3RyaWN0IHJvdXRpbmcgaXMgZmFsc2UgPT4gYC9oZWxsby9oZXkvYCBhbmQgYC9oZWxsby9oZXlgIGFyZSB0cmVhdGVkIHRoZSBzYW1lXG4gIHJldHVybiByZXN1bHQubGVuZ3RoID4gMSAmJiByZXN1bHRbcmVzdWx0Lmxlbmd0aCAtIDFdID09PSAnLycgPyByZXN1bHQuc2xpY2UoMCwgLTEpIDogcmVzdWx0XG59XG5cbmV4cG9ydCBjb25zdCBtZXJnZVBhdGggPSAoLi4ucGF0aHM6IHN0cmluZ1tdKTogc3RyaW5nID0+IHtcbiAgbGV0IHA6IHN0cmluZyA9ICcnXG4gIGxldCBlbmRzV2l0aFNsYXNoID0gZmFsc2VcblxuICBmb3IgKGxldCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgLyogWycvaGV5LycsJy9zYXknXSA9PiBbJy9oZXknLCAnL3NheSddICovXG4gICAgaWYgKHBbcC5sZW5ndGggLSAxXSA9PT0gJy8nKSB7XG4gICAgICBwID0gcC5zbGljZSgwLCAtMSlcbiAgICAgIGVuZHNXaXRoU2xhc2ggPSB0cnVlXG4gICAgfVxuXG4gICAgLyogWycvaGV5Jywnc2F5J10gPT4gWycvaGV5JywgJy9zYXknXSAqL1xuICAgIGlmIChwYXRoWzBdICE9PSAnLycpIHtcbiAgICAgIHBhdGggPSBgLyR7cGF0aH1gXG4gICAgfVxuXG4gICAgLyogWycvaGV5LycsICcvJ10gPT4gYC9oZXkvYCAqL1xuICAgIGlmIChwYXRoID09PSAnLycgJiYgZW5kc1dpdGhTbGFzaCkge1xuICAgICAgcCA9IGAke3B9L2BcbiAgICB9IGVsc2UgaWYgKHBhdGggIT09ICcvJykge1xuICAgICAgcCA9IGAke3B9JHtwYXRofWBcbiAgICB9XG5cbiAgICAvKiBbJy8nLCAnLyddID0+IGAvYCAqL1xuICAgIGlmIChwYXRoID09PSAnLycgJiYgcCA9PT0gJycpIHtcbiAgICAgIHAgPSAnLydcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcFxufVxuXG5leHBvcnQgY29uc3QgY2hlY2tPcHRpb25hbFBhcmFtZXRlciA9IChwYXRoOiBzdHJpbmcpOiBzdHJpbmdbXSB8IG51bGwgPT4ge1xuICAvKlxuICAgSWYgcGF0aCBpcyBgL2FwaS9hbmltYWxzLzp0eXBlP2AgaXQgd2lsbCByZXR1cm46XG4gICBbYC9hcGkvYW5pbWFsc2AsIGAvYXBpL2FuaW1hbHMvOnR5cGVgXVxuICAgaW4gb3RoZXIgY2FzZXMgaXQgd2lsbCByZXR1cm4gbnVsbFxuICAqL1xuXG4gIGlmICghcGF0aC5tYXRjaCgvXFw6LitcXD8kLykpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgY29uc3Qgc2VnbWVudHMgPSBwYXRoLnNwbGl0KCcvJylcbiAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXVxuICBsZXQgYmFzZVBhdGggPSAnJ1xuXG4gIHNlZ21lbnRzLmZvckVhY2goKHNlZ21lbnQpID0+IHtcbiAgICBpZiAoc2VnbWVudCAhPT0gJycgJiYgIS9cXDovLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgIGJhc2VQYXRoICs9ICcvJyArIHNlZ21lbnRcbiAgICB9IGVsc2UgaWYgKC9cXDovLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgIGlmICgvXFw/Ly50ZXN0KHNlZ21lbnQpKSB7XG4gICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCAmJiBiYXNlUGF0aCA9PT0gJycpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goJy8nKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdHMucHVzaChiYXNlUGF0aClcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvcHRpb25hbFNlZ21lbnQgPSBzZWdtZW50LnJlcGxhY2UoJz8nLCAnJylcbiAgICAgICAgYmFzZVBhdGggKz0gJy8nICsgb3B0aW9uYWxTZWdtZW50XG4gICAgICAgIHJlc3VsdHMucHVzaChiYXNlUGF0aClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhc2VQYXRoICs9ICcvJyArIHNlZ21lbnRcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIHJlc3VsdHMuZmlsdGVyKCh2LCBpLCBhKSA9PiBhLmluZGV4T2YodikgPT09IGkpXG59XG5cbi8vIE9wdGltaXplZFxuY29uc3QgX2RlY29kZVVSSSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB7XG4gIGlmICghL1slK10vLnRlc3QodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgaWYgKHZhbHVlLmluZGV4T2YoJysnKSAhPT0gLTEpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gIH1cbiAgcmV0dXJuIC8lLy50ZXN0KHZhbHVlKSA/IGRlY29kZVVSSUNvbXBvbmVudF8odmFsdWUpIDogdmFsdWVcbn1cblxuY29uc3QgX2dldFF1ZXJ5UGFyYW0gPSAoXG4gIHVybDogc3RyaW5nLFxuICBrZXk/OiBzdHJpbmcsXG4gIG11bHRpcGxlPzogYm9vbGVhblxuKTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgUmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IHN0cmluZ1tdIHwgUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0+IHtcbiAgbGV0IGVuY29kZWRcblxuICBpZiAoIW11bHRpcGxlICYmIGtleSAmJiAhL1slK10vLnRlc3Qoa2V5KSkge1xuICAgIC8vIG9wdGltaXplZCBmb3IgdW5lbmNvZGVkIGtleVxuXG4gICAgbGV0IGtleUluZGV4ID0gdXJsLmluZGV4T2YoYD8ke2tleX1gLCA4KVxuICAgIGlmIChrZXlJbmRleCA9PT0gLTEpIHtcbiAgICAgIGtleUluZGV4ID0gdXJsLmluZGV4T2YoYCYke2tleX1gLCA4KVxuICAgIH1cbiAgICB3aGlsZSAoa2V5SW5kZXggIT09IC0xKSB7XG4gICAgICBjb25zdCB0cmFpbGluZ0tleUNvZGUgPSB1cmwuY2hhckNvZGVBdChrZXlJbmRleCArIGtleS5sZW5ndGggKyAxKVxuICAgICAgaWYgKHRyYWlsaW5nS2V5Q29kZSA9PT0gNjEpIHtcbiAgICAgICAgY29uc3QgdmFsdWVJbmRleCA9IGtleUluZGV4ICsga2V5Lmxlbmd0aCArIDJcbiAgICAgICAgY29uc3QgZW5kSW5kZXggPSB1cmwuaW5kZXhPZignJicsIHZhbHVlSW5kZXgpXG4gICAgICAgIHJldHVybiBfZGVjb2RlVVJJKHVybC5zbGljZSh2YWx1ZUluZGV4LCBlbmRJbmRleCA9PT0gLTEgPyB1bmRlZmluZWQgOiBlbmRJbmRleCkpXG4gICAgICB9IGVsc2UgaWYgKHRyYWlsaW5nS2V5Q29kZSA9PSAzOCB8fCBpc05hTih0cmFpbGluZ0tleUNvZGUpKSB7XG4gICAgICAgIHJldHVybiAnJ1xuICAgICAgfVxuICAgICAga2V5SW5kZXggPSB1cmwuaW5kZXhPZihgJiR7a2V5fWAsIGtleUluZGV4ICsgMSlcbiAgICB9XG5cbiAgICBlbmNvZGVkID0gL1slK10vLnRlc3QodXJsKVxuICAgIGlmICghZW5jb2RlZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICAvLyBmYWxsYmFjayB0byBkZWZhdWx0IHJvdXRpbmVcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7fVxuICBlbmNvZGVkID8/PSAvWyUrXS8udGVzdCh1cmwpXG5cbiAgbGV0IGtleUluZGV4ID0gdXJsLmluZGV4T2YoJz8nLCA4KVxuICB3aGlsZSAoa2V5SW5kZXggIT09IC0xKSB7XG4gICAgY29uc3QgbmV4dEtleUluZGV4ID0gdXJsLmluZGV4T2YoJyYnLCBrZXlJbmRleCArIDEpXG4gICAgbGV0IHZhbHVlSW5kZXggPSB1cmwuaW5kZXhPZignPScsIGtleUluZGV4KVxuICAgIGlmICh2YWx1ZUluZGV4ID4gbmV4dEtleUluZGV4ICYmIG5leHRLZXlJbmRleCAhPT0gLTEpIHtcbiAgICAgIHZhbHVlSW5kZXggPSAtMVxuICAgIH1cbiAgICBsZXQgbmFtZSA9IHVybC5zbGljZShcbiAgICAgIGtleUluZGV4ICsgMSxcbiAgICAgIHZhbHVlSW5kZXggPT09IC0xID8gKG5leHRLZXlJbmRleCA9PT0gLTEgPyB1bmRlZmluZWQgOiBuZXh0S2V5SW5kZXgpIDogdmFsdWVJbmRleFxuICAgIClcbiAgICBpZiAoZW5jb2RlZCkge1xuICAgICAgbmFtZSA9IF9kZWNvZGVVUkkobmFtZSlcbiAgICB9XG5cbiAgICBrZXlJbmRleCA9IG5leHRLZXlJbmRleFxuXG4gICAgaWYgKG5hbWUgPT09ICcnKSB7XG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGxldCB2YWx1ZVxuICAgIGlmICh2YWx1ZUluZGV4ID09PSAtMSkge1xuICAgICAgdmFsdWUgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSA9IHVybC5zbGljZSh2YWx1ZUluZGV4ICsgMSwgbmV4dEtleUluZGV4ID09PSAtMSA/IHVuZGVmaW5lZCA6IG5leHRLZXlJbmRleClcbiAgICAgIGlmIChlbmNvZGVkKSB7XG4gICAgICAgIHZhbHVlID0gX2RlY29kZVVSSSh2YWx1ZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgIGlmICghKHJlc3VsdHNbbmFtZV0gJiYgQXJyYXkuaXNBcnJheShyZXN1bHRzW25hbWVdKSkpIHtcbiAgICAgICAgcmVzdWx0c1tuYW1lXSA9IFtdXG4gICAgICB9XG4gICAgICA7KHJlc3VsdHNbbmFtZV0gYXMgc3RyaW5nW10pLnB1c2godmFsdWUpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdHNbbmFtZV0gPz89IHZhbHVlXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGtleSA/IHJlc3VsdHNba2V5XSA6IHJlc3VsdHNcbn1cblxuZXhwb3J0IGNvbnN0IGdldFF1ZXJ5UGFyYW06IChcbiAgdXJsOiBzdHJpbmcsXG4gIGtleT86IHN0cmluZ1xuKSA9PiBzdHJpbmcgfCB1bmRlZmluZWQgfCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0gX2dldFF1ZXJ5UGFyYW0gYXMgKFxuICB1cmw6IHN0cmluZyxcbiAga2V5Pzogc3RyaW5nXG4pID0+IHN0cmluZyB8IHVuZGVmaW5lZCB8IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cblxuZXhwb3J0IGNvbnN0IGdldFF1ZXJ5UGFyYW1zID0gKFxuICB1cmw6IHN0cmluZyxcbiAga2V5Pzogc3RyaW5nXG4pOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB8IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9PiB7XG4gIHJldHVybiBfZ2V0UXVlcnlQYXJhbSh1cmwsIGtleSwgdHJ1ZSkgYXMgc3RyaW5nW10gfCB1bmRlZmluZWQgfCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT5cbn1cblxuLy8gYGRlY29kZVVSSUNvbXBvbmVudGAgaXMgYSBsb25nIG5hbWUuXG4vLyBCeSBtYWtpbmcgaXQgYSBmdW5jdGlvbiwgd2UgY2FuIHVzZSBpdCBjb21tb25seSB3aGVuIG1pbmlmaWVkLCByZWR1Y2luZyB0aGUgYW1vdW50IG9mIGNvZGUuXG5leHBvcnQgY29uc3QgZGVjb2RlVVJJQ29tcG9uZW50XyA9IGRlY29kZVVSSUNvbXBvbmVudFxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sTUFBTSxZQUFZLENBQUM7RUFDeEIsTUFBTSxRQUFRLEtBQUssS0FBSyxDQUFDO0VBQ3pCLElBQUksS0FBSyxDQUFDLEVBQUUsS0FBSyxJQUFJO0lBQ25CLE1BQU0sS0FBSztFQUNiO0VBQ0EsT0FBTztBQUNULEVBQUM7QUFFRCxPQUFPLE1BQU0sbUJBQW1CLENBQUM7RUFDL0IsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxzQkFBc0I7RUFFL0MsTUFBTSxRQUFRLFVBQVU7RUFDeEIsT0FBTyxrQkFBa0IsT0FBTztBQUNsQyxFQUFDO0FBRUQsTUFBTSx3QkFBd0IsQ0FBQztFQUM3QixNQUFNLFNBQTZCLEVBQUU7RUFFckMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTztJQUN4QyxNQUFNLE9BQU8sQ0FBQyxDQUFDLEVBQUUsT0FBTztJQUN4QixPQUFPLElBQUksQ0FBQztNQUFDO01BQU07S0FBTTtJQUN6QixPQUFPO0VBQ1Q7RUFFQSxPQUFPO0lBQUU7SUFBUTtFQUFLO0FBQ3hCO0FBRUEsTUFBTSxvQkFBb0IsQ0FBQyxPQUFpQjtFQUMxQyxJQUFLLElBQUksSUFBSSxPQUFPLE1BQU0sR0FBRyxHQUFHLEtBQUssR0FBRyxJQUFLO0lBQzNDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEVBQUU7SUFFeEIsSUFBSyxJQUFJLElBQUksTUFBTSxNQUFNLEdBQUcsR0FBRyxLQUFLLEdBQUcsSUFBSztNQUMxQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU87UUFDM0Is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
// denoCacheMetadata=5166489709900349848,9630192253687365500