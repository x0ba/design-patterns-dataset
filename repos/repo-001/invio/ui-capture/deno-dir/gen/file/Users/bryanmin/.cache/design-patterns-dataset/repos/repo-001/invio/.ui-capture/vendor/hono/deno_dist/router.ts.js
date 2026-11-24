export const METHOD_NAME_ALL = 'ALL';
export const METHOD_NAME_ALL_LOWERCASE = 'all';
export const METHODS = [
  'get',
  'post',
  'put',
  'delete',
  'options',
  'patch'
];
export const MESSAGE_MATCHER_IS_ALREADY_BUILT = 'Can not add a route since the matcher is already built.';
/*
The router returns the result of `match` in either format.

[[handler, paramIndexMap][], paramArray]
e.g.
[
  [
    [middlewareA, {}],                     // '*'
    [funcA,       {'id': 0}],              // '/user/:id/*'
    [funcB,       {'id': 0, 'action': 1}], // '/user/:id/:action'
  ],
  ['123', 'abc']
]

[[handler, params][]]
e.g.
[
  [
    [middlewareA, {}],                             // '*'
    [funcA,       {'id': '123'}],                  // '/user/:id/*'
    [funcB,       {'id': '123', 'action': 'abc'}], // '/user/:id/:action'
  ]
]
*/ export class UnsupportedPathError extends Error {
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9ob25vL2Rlbm9fZGlzdC9yb3V0ZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IE1FVEhPRF9OQU1FX0FMTCA9ICdBTEwnIGFzIGNvbnN0XG5leHBvcnQgY29uc3QgTUVUSE9EX05BTUVfQUxMX0xPV0VSQ0FTRSA9ICdhbGwnIGFzIGNvbnN0XG5leHBvcnQgY29uc3QgTUVUSE9EUyA9IFsnZ2V0JywgJ3Bvc3QnLCAncHV0JywgJ2RlbGV0ZScsICdvcHRpb25zJywgJ3BhdGNoJ10gYXMgY29uc3RcbmV4cG9ydCBjb25zdCBNRVNTQUdFX01BVENIRVJfSVNfQUxSRUFEWV9CVUlMVCA9XG4gICdDYW4gbm90IGFkZCBhIHJvdXRlIHNpbmNlIHRoZSBtYXRjaGVyIGlzIGFscmVhZHkgYnVpbHQuJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlcjxUPiB7XG4gIG5hbWU6IHN0cmluZ1xuICBhZGQobWV0aG9kOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgaGFuZGxlcjogVCk6IHZvaWRcbiAgbWF0Y2gobWV0aG9kOiBzdHJpbmcsIHBhdGg6IHN0cmluZyk6IFJlc3VsdDxUPlxufVxuXG5leHBvcnQgdHlwZSBQYXJhbUluZGV4TWFwID0gUmVjb3JkPHN0cmluZywgbnVtYmVyPlxuZXhwb3J0IHR5cGUgUGFyYW1TdGFzaCA9IHN0cmluZ1tdXG5leHBvcnQgdHlwZSBQYXJhbXMgPSBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG5leHBvcnQgdHlwZSBSZXN1bHQ8VD4gPSBbW1QsIFBhcmFtSW5kZXhNYXBdW10sIFBhcmFtU3Rhc2hdIHwgW1tULCBQYXJhbXNdW11dXG4vKlxuVGhlIHJvdXRlciByZXR1cm5zIHRoZSByZXN1bHQgb2YgYG1hdGNoYCBpbiBlaXRoZXIgZm9ybWF0LlxuXG5bW2hhbmRsZXIsIHBhcmFtSW5kZXhNYXBdW10sIHBhcmFtQXJyYXldXG5lLmcuXG5bXG4gIFtcbiAgICBbbWlkZGxld2FyZUEsIHt9XSwgICAgICAgICAgICAgICAgICAgICAvLyAnKidcbiAgICBbZnVuY0EsICAgICAgIHsnaWQnOiAwfV0sICAgICAgICAgICAgICAvLyAnL3VzZXIvOmlkLyonXG4gICAgW2Z1bmNCLCAgICAgICB7J2lkJzogMCwgJ2FjdGlvbic6IDF9XSwgLy8gJy91c2VyLzppZC86YWN0aW9uJ1xuICBdLFxuICBbJzEyMycsICdhYmMnXVxuXVxuXG5bW2hhbmRsZXIsIHBhcmFtc11bXV1cbmUuZy5cbltcbiAgW1xuICAgIFttaWRkbGV3YXJlQSwge31dLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gJyonXG4gICAgW2Z1bmNBLCAgICAgICB7J2lkJzogJzEyMyd9XSwgICAgICAgICAgICAgICAgICAvLyAnL3VzZXIvOmlkLyonXG4gICAgW2Z1bmNCLCAgICAgICB7J2lkJzogJzEyMycsICdhY3Rpb24nOiAnYWJjJ31dLCAvLyAnL3VzZXIvOmlkLzphY3Rpb24nXG4gIF1cbl1cbiovXG5cbmV4cG9ydCBjbGFzcyBVbnN1cHBvcnRlZFBhdGhFcnJvciBleHRlbmRzIEVycm9yIHt9XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxNQUFNLGtCQUFrQixNQUFjO0FBQzdDLE9BQU8sTUFBTSw0QkFBNEIsTUFBYztBQUN2RCxPQUFPLE1BQU0sVUFBVTtFQUFDO0VBQU87RUFBUTtFQUFPO0VBQVU7RUFBVztDQUFRLENBQVM7QUFDcEYsT0FBTyxNQUFNLG1DQUNYLDBEQUF5RDtBQVkzRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF1QkEsR0FFQSxPQUFPLE1BQU0sNkJBQTZCO0FBQU8ifQ==
// denoCacheMetadata=11866599726677358850,8853769517827382810