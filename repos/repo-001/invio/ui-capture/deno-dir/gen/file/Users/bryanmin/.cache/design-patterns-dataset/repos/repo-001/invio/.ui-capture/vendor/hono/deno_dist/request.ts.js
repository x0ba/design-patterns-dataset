/* eslint-disable @typescript-eslint/no-explicit-any */ import { parseBody } from './utils/body.ts';
import { getQueryParam, getQueryParams, decodeURIComponent_ } from './utils/url.ts';
export class HonoRequest {
  /**
   * `.raw` can get the raw Request object.
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   * @see https://hono.dev/api/request#raw
   */ raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   * @see https://hono.dev/api/request#path
   */ path;
  bodyCache = {};
  constructor(request, path = '/', matchResult = [
    []
  ]){
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.getDecodedParam(key) : this.getAllDecodedParams();
  }
  getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.getParamValue(paramKey);
    return param ? /\%/.test(param) ? decodeURIComponent_(param) : param : undefined;
  }
  getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys){
      const value = this.getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value && typeof value === 'string') {
        decoded[key] = /\%/.test(value) ? decodeURIComponent_(value) : value;
      }
    }
    return decoded;
  }
  getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name.toLowerCase()) ?? undefined;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key)=>{
      headerData[key] = value;
    });
    return headerData;
  }
  /**
   * `.parseBody()` can parse Request body of type `multipart/form-data` or `application/x-www-form-urlencoded`
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.parseBody()
   * })
   * ```
   * @see https://hono.dev/api/request#parsebody
   */ async parseBody(options) {
    if (this.bodyCache.parsedBody) {
      return this.bodyCache.parsedBody;
    }
    const parsedBody = await parseBody(this, options);
    this.bodyCache.parsedBody = parsedBody;
    return parsedBody;
  }
  cachedBody = (key)=>{
    const { bodyCache, raw } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    /**
     * If an arrayBuffer cache is exist,
     * use it for creating a text, json, and others.
     */ if (bodyCache.arrayBuffer) {
      return (async ()=>{
        return await new Response(bodyCache.arrayBuffer)[key]();
      })();
    }
    return bodyCache[key] = raw[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   * @see https://hono.dev/api/request#json
   */ json() {
    return this.cachedBody('json');
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   * @see https://hono.dev/api/request#text
   */ text() {
    return this.cachedBody('text');
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   * @see https://hono.dev/api/request#arraybuffer
   */ arrayBuffer() {
    return this.cachedBody('arrayBuffer');
  }
  blob() {
    return this.cachedBody('blob');
  }
  formData() {
    return this.cachedBody('formData');
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   * @see https://hono.dev/api/request#url
   */ get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   * @see https://hono.dev/api/request#method
   */ get method() {
    return this.raw.method;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   * @see https://hono.dev/api/request#matchedroutes
   */ get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]])=>route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   * @see https://hono.dev/api/request#routepath
   */ get routePath() {
    return this.#matchResult[0].map(([[, route]])=>route)[this.routeIndex].path;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9ob25vL2Rlbm9fZGlzdC9yZXF1ZXN0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cbmltcG9ydCB0eXBlIHsgUmVzdWx0IH0gZnJvbSAnLi9yb3V0ZXIudHMnXG5pbXBvcnQgdHlwZSB7XG4gIElucHV0LFxuICBJbnB1dFRvRGF0YUJ5VGFyZ2V0LFxuICBQYXJhbUtleXMsXG4gIFBhcmFtS2V5VG9SZWNvcmQsXG4gIFJlbW92ZVF1ZXN0aW9uLFxuICBVbmRlZmluZWRJZkhhdmluZ1F1ZXN0aW9uLFxuICBWYWxpZGF0aW9uVGFyZ2V0cyxcbiAgUm91dGVyUm91dGUsXG59IGZyb20gJy4vdHlwZXMudHMnXG5pbXBvcnQgeyBwYXJzZUJvZHkgfSBmcm9tICcuL3V0aWxzL2JvZHkudHMnXG5pbXBvcnQgdHlwZSB7IEJvZHlEYXRhLCBQYXJzZUJvZHlPcHRpb25zIH0gZnJvbSAnLi91dGlscy9ib2R5LnRzJ1xuaW1wb3J0IHR5cGUgeyBVbmlvblRvSW50ZXJzZWN0aW9uIH0gZnJvbSAnLi91dGlscy90eXBlcy50cydcbmltcG9ydCB7IGdldFF1ZXJ5UGFyYW0sIGdldFF1ZXJ5UGFyYW1zLCBkZWNvZGVVUklDb21wb25lbnRfIH0gZnJvbSAnLi91dGlscy91cmwudHMnXG5cbnR5cGUgQm9keSA9IHtcbiAganNvbjogYW55XG4gIHRleHQ6IHN0cmluZ1xuICBhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXJcbiAgYmxvYjogQmxvYlxuICBmb3JtRGF0YTogRm9ybURhdGFcbn1cbnR5cGUgQm9keUNhY2hlID0gUGFydGlhbDxCb2R5ICYgeyBwYXJzZWRCb2R5OiBCb2R5RGF0YSB9PlxuXG5leHBvcnQgY2xhc3MgSG9ub1JlcXVlc3Q8UCBleHRlbmRzIHN0cmluZyA9ICcvJywgSSBleHRlbmRzIElucHV0WydvdXQnXSA9IHt9PiB7XG4gIC8qKlxuICAgKiBgLnJhd2AgY2FuIGdldCB0aGUgcmF3IFJlcXVlc3Qgb2JqZWN0LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiAvLyBGb3IgQ2xvdWRmbGFyZSBXb3JrZXJzXG4gICAqIGFwcC5wb3N0KCcvJywgYXN5bmMgKGMpID0+IHtcbiAgICogICBjb25zdCBtZXRhZGF0YSA9IGMucmVxLnJhdy5jZj8uaG9zdE1ldGFkYXRhP1xuICAgKiAgIC4uLlxuICAgKiB9KVxuICAgKiBgYGBcbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9yZXF1ZXN0I3Jhd1xuICAgKi9cbiAgcmF3OiBSZXF1ZXN0XG5cbiAgI3ZhbGlkYXRlZERhdGE6IHsgW0sgaW4ga2V5b2YgVmFsaWRhdGlvblRhcmdldHNdPzoge30gfSAvLyBTaG9ydCBuYW1lIG9mIHZhbGlkYXRlZERhdGFcbiAgI21hdGNoUmVzdWx0OiBSZXN1bHQ8W3Vua25vd24sIFJvdXRlclJvdXRlXT5cbiAgcm91dGVJbmRleDogbnVtYmVyID0gMFxuICAvKipcbiAgICogYC5wYXRoYCBjYW4gZ2V0IHRoZSBwYXRobmFtZSBvZiB0aGUgcmVxdWVzdC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHNcbiAgICogYXBwLmdldCgnL2Fib3V0L21lJywgKGMpID0+IHtcbiAgICogICBjb25zdCBwYXRobmFtZSA9IGMucmVxLnBhdGggLy8gYC9hYm91dC9tZWBcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvcmVxdWVzdCNwYXRoXG4gICAqL1xuICBwYXRoOiBzdHJpbmdcbiAgYm9keUNhY2hlOiBCb2R5Q2FjaGUgPSB7fVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHJlcXVlc3Q6IFJlcXVlc3QsXG4gICAgcGF0aDogc3RyaW5nID0gJy8nLFxuICAgIG1hdGNoUmVzdWx0OiBSZXN1bHQ8W3Vua25vd24sIFJvdXRlclJvdXRlXT4gPSBbW11dXG4gICkge1xuICAgIHRoaXMucmF3ID0gcmVxdWVzdFxuICAgIHRoaXMucGF0aCA9IHBhdGhcbiAgICB0aGlzLiNtYXRjaFJlc3VsdCA9IG1hdGNoUmVzdWx0XG4gICAgdGhpcy4jdmFsaWRhdGVkRGF0YSA9IHt9XG4gIH1cblxuICAvKipcbiAgICogYC5yZXEucGFyYW0oKWAgZ2V0cyB0aGUgcGF0aCBwYXJhbWV0ZXJzLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBjb25zdCBuYW1lID0gYy5yZXEucGFyYW0oJ25hbWUnKVxuICAgKiAvLyBvciBhbGwgcGFyYW1ldGVycyBhdCBvbmNlXG4gICAqIGNvbnN0IHsgaWQsIGNvbW1lbnRfaWQgfSA9IGMucmVxLnBhcmFtKClcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvcm91dGluZyNwYXRoLXBhcmFtZXRlclxuICAgKi9cbiAgcGFyYW08UDIgZXh0ZW5kcyBzdHJpbmcgPSBQPihcbiAgICBrZXk6IFJlbW92ZVF1ZXN0aW9uPFBhcmFtS2V5czxQMj4+XG4gICk6IFVuZGVmaW5lZElmSGF2aW5nUXVlc3Rpb248UGFyYW1LZXlzPFAyPj5cbiAgcGFyYW08UDIgZXh0ZW5kcyBzdHJpbmcgPSBQPigpOiBVbmlvblRvSW50ZXJzZWN0aW9uPFBhcmFtS2V5VG9SZWNvcmQ8UGFyYW1LZXlzPFAyPj4+XG4gIHBhcmFtKGtleT86IHN0cmluZyk6IHVua25vd24ge1xuICAgIHJldHVybiBrZXkgPyB0aGlzLmdldERlY29kZWRQYXJhbShrZXkpIDogdGhpcy5nZXRBbGxEZWNvZGVkUGFyYW1zKClcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGVjb2RlZFBhcmFtKGtleTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBwYXJhbUtleSA9IHRoaXMuI21hdGNoUmVzdWx0WzBdW3RoaXMucm91dGVJbmRleF1bMV1ba2V5XVxuICAgIGNvbnN0IHBhcmFtID0gdGhpcy5nZXRQYXJhbVZhbHVlKHBhcmFtS2V5KVxuXG4gICAgcmV0dXJuIHBhcmFtID8gKC9cXCUvLnRlc3QocGFyYW0pID8gZGVjb2RlVVJJQ29tcG9uZW50XyhwYXJhbSkgOiBwYXJhbSkgOiB1bmRlZmluZWRcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QWxsRGVjb2RlZFBhcmFtcygpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgICBjb25zdCBkZWNvZGVkOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge31cblxuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLiNtYXRjaFJlc3VsdFswXVt0aGlzLnJvdXRlSW5kZXhdWzFdKVxuICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5nZXRQYXJhbVZhbHVlKHRoaXMuI21hdGNoUmVzdWx0WzBdW3RoaXMucm91dGVJbmRleF1bMV1ba2V5XSlcbiAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGRlY29kZWRba2V5XSA9IC9cXCUvLnRlc3QodmFsdWUpID8gZGVjb2RlVVJJQ29tcG9uZW50Xyh2YWx1ZSkgOiB2YWx1ZVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWNvZGVkXG4gIH1cblxuICBwcml2YXRlIGdldFBhcmFtVmFsdWUocGFyYW1LZXk6IGFueSk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuI21hdGNoUmVzdWx0WzFdID8gdGhpcy4jbWF0Y2hSZXN1bHRbMV1bcGFyYW1LZXkgYXMgYW55XSA6IHBhcmFtS2V5XG4gIH1cblxuICAvKipcbiAgICogYC5xdWVyeSgpYCBjYW4gZ2V0IHF1ZXJ5c3RyaW5nIHBhcmFtZXRlcnMuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHRzXG4gICAqIC8vIFF1ZXJ5IHBhcmFtc1xuICAgKiBhcHAuZ2V0KCcvc2VhcmNoJywgKGMpID0+IHtcbiAgICogICBjb25zdCBxdWVyeSA9IGMucmVxLnF1ZXJ5KCdxJylcbiAgICogfSlcbiAgICpcbiAgICogLy8gR2V0IGFsbCBwYXJhbXMgYXQgb25jZVxuICAgKiBhcHAuZ2V0KCcvc2VhcmNoJywgKGMpID0+IHtcbiAgICogICBjb25zdCB7IHEsIGxpbWl0LCBvZmZzZXQgfSA9IGMucmVxLnF1ZXJ5KClcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvcmVxdWVzdCNxdWVyeVxuICAgKi9cbiAgcXVlcnkoa2V5OiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWRcbiAgcXVlcnkoKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuICBxdWVyeShrZXk/OiBzdHJpbmcpIHtcbiAgICByZXR1cm4gZ2V0UXVlcnlQYXJhbSh0aGlzLnVybCwga2V5KVxuICB9XG5cbiAgLyoqXG4gICAqIGAucXVlcmllcygpYCBjYW4gZ2V0IG11bHRpcGxlIHF1ZXJ5c3RyaW5nIHBhcmFtZXRlciB2YWx1ZXMsIGUuZy4gL3NlYXJjaD90YWdzPUEmdGFncz1CXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHRzXG4gICAqIGFwcC5nZXQoJy9zZWFyY2gnLCAoYykgPT4ge1xuICAgKiAgIC8vIHRhZ3Mgd2lsbCBiZSBzdHJpbmdbXVxuICAgKiAgIGNvbnN0IHRhZ3MgPSBjLnJlcS5xdWVyaWVzKCd0YWdzJylcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvcmVxdWVzdCNxdWVyaWVzXG4gICAqL1xuICBxdWVyaWVzKGtleTogc3RyaW5nKTogc3RyaW5nW10gfCB1bmRlZmluZWRcbiAgcXVlcmllcygpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT5cbiAgcXVlcmllcyhrZXk/OiBzdHJpbmcpIHtcbiAgICByZXR1cm4gZ2V0UXVlcnlQYXJhbXModGhpcy51cmwsIGtleSlcbiAgfVxuXG4gIC8qKlxuICAgKiBgLmhlYWRlcigpYCBjYW4gZ2V0IHRoZSByZXF1ZXN0IGhlYWRlciB2YWx1ZS5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHNcbiAgICogYXBwLmdldCgnLycsIChjKSA9PiB7XG4gICAqICAgY29uc3QgdXNlckFnZW50ID0gYy5yZXEuaGVhZGVyKCdVc2VyLUFnZW50JylcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvcmVxdWVzdCNoZWFkZXJcbiAgICovXG4gIGhlYWRlcihuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWRcbiAgaGVhZGVyKCk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbiAgaGVhZGVyKG5hbWU/OiBzdHJpbmcpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmF3LmhlYWRlcnMuZ2V0KG5hbWUudG9Mb3dlckNhc2UoKSkgPz8gdW5kZWZpbmVkXG4gICAgfVxuXG4gICAgY29uc3QgaGVhZGVyRGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgdW5kZWZpbmVkPiA9IHt9XG4gICAgdGhpcy5yYXcuaGVhZGVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBoZWFkZXJEYXRhW2tleV0gPSB2YWx1ZVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRlckRhdGFcbiAgfVxuXG4gIC8qKlxuICAgKiBgLnBhcnNlQm9keSgpYCBjYW4gcGFyc2UgUmVxdWVzdCBib2R5IG9mIHR5cGUgYG11bHRpcGFydC9mb3JtLWRhdGFgIG9yIGBhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRgXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHRzXG4gICAqIGFwcC5wb3N0KCcvZW50cnknLCBhc3luYyAoYykgPT4ge1xuICAgKiAgIGNvbnN0IGJvZHkgPSBhd2FpdCBjLnJlcS5wYXJzZUJvZHkoKVxuICAgKiB9KVxuICAgKiBgYGBcbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9yZXF1ZXN0I3BhcnNlYm9keVxuICAgKi9cbiAgYXN5bmMgcGFyc2VCb2R5PFQgZXh0ZW5kcyBCb2R5RGF0YSA9IEJvZHlEYXRhPihvcHRpb25zPzogUGFyc2VCb2R5T3B0aW9ucyk6IFByb21pc2U8VD4ge1xuICAgIGlmICh0aGlzLmJvZHlDYWNoZS5wYXJzZWRCb2R5KSB7XG4gICAgICByZXR1cm4gdGhpcy5ib2R5Q2FjaGUucGFyc2VkQm9keSBhcyBUXG4gICAgfVxuICAgIGNvbnN0IHBhcnNlZEJvZHkgPSBhd2FpdCBwYXJzZUJvZHk8VD4odGhpcywgb3B0aW9ucylcbiAgICB0aGlzLmJvZHlDYWNoZS5wYXJzZWRCb2R5ID0gcGFyc2VkQm9keVxuICAgIHJldHVybiBwYXJzZWRCb2R5XG4gIH1cblxuICBwcml2YXRlIGNhY2hlZEJvZHkgPSAoa2V5OiBrZXlvZiBCb2R5KSA9PiB7XG4gICAgY29uc3QgeyBib2R5Q2FjaGUsIHJhdyB9ID0gdGhpc1xuICAgIGNvbnN0IGNhY2hlZEJvZHkgPSBib2R5Q2FjaGVba2V5XVxuICAgIGlmIChjYWNoZWRCb2R5KSB7XG4gICAgICByZXR1cm4gY2FjaGVkQm9keVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBJZiBhbiBhcnJheUJ1ZmZlciBjYWNoZSBpcyBleGlzdCxcbiAgICAgKiB1c2UgaXQgZm9yIGNyZWF0aW5nIGEgdGV4dCwganNvbiwgYW5kIG90aGVycy5cbiAgICAgKi9cbiAgICBpZiAoYm9keUNhY2hlLmFycmF5QnVmZmVyKSB7XG4gICAgICByZXR1cm4gKGFzeW5jICgpID0+IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IG5ldyBSZXNwb25zZShib2R5Q2FjaGUuYXJyYXlCdWZmZXIpW2tleV0oKVxuICAgICAgfSkoKVxuICAgIH1cbiAgICByZXR1cm4gKGJvZHlDYWNoZVtrZXldID0gcmF3W2tleV0oKSlcbiAgfVxuXG4gIC8qKlxuICAgKiBgLmpzb24oKWAgY2FuIHBhcnNlIFJlcXVlc3QgYm9keSBvZiB0eXBlIGBhcHBsaWNhdGlvbi9qc29uYFxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBhcHAucG9zdCgnL2VudHJ5JywgYXN5bmMgKGMpID0+IHtcbiAgICogICBjb25zdCBib2R5ID0gYXdhaXQgYy5yZXEuanNvbigpXG4gICAqIH0pXG4gICAqIGBgYFxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL3JlcXVlc3QjanNvblxuICAgKi9cbiAganNvbjxUID0gYW55PigpOiBQcm9taXNlPFQ+IHtcbiAgICByZXR1cm4gdGhpcy5jYWNoZWRCb2R5KCdqc29uJylcbiAgfVxuXG4gIC8qKlxuICAgKiBgLnRleHQoKWAgY2FuIHBhcnNlIFJlcXVlc3QgYm9keSBvZiB0eXBlIGB0ZXh0L3BsYWluYFxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBhcHAucG9zdCgnL2VudHJ5JywgYXN5bmMgKGMpID0+IHtcbiAgICogICBjb25zdCBib2R5ID0gYXdhaXQgYy5yZXEudGV4dCgpXG4gICAqIH0pXG4gICAqIGBgYFxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL3JlcXVlc3QjdGV4dFxuICAgKi9cbiAgdGV4dCgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiB0aGlzLmNhY2hlZEJvZHkoJ3RleHQnKVxuICB9XG5cbiAgLyoqXG4gICAqIGAuYXJyYXlCdWZmZXIoKWAgcGFyc2UgUmVxdWVzdCBib2R5IGFzIGFuIGBBcnJheUJ1ZmZlcmBcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHNcbiAgICogYXBwLnBvc3QoJy9lbnRyeScsIGFzeW5jIChjKSA9PiB7XG4gICAqICAgY29uc3QgYm9keSA9IGF3YWl0IGMucmVxLmFycmF5QnVmZmVyKClcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvcmVxdWVzdCNhcnJheWJ1ZmZlclxuICAgKi9cbiAgYXJyYXlCdWZmZXIoKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIHJldHVybiB0aGlzLmNhY2hlZEJvZHkoJ2FycmF5QnVmZmVyJylcbiAgfVxuXG4gIGJsb2IoKTogUHJvbWlzZTxCbG9iPiB7XG4gICAgcmV0dXJuIHRoaXMuY2FjaGVkQm9keSgnYmxvYicpXG4gIH1cblxuICBmb3JtRGF0YSgpOiBQcm9taXNlPEZvcm1EYXRhPiB7XG4gICAgcmV0dXJuIHRoaXMuY2FjaGVkQm9keSgnZm9ybURhdGEnKVxuICB9XG5cbiAgYWRkVmFsaWRhdGVkRGF0YSh0YXJnZXQ6IGtleW9mIFZhbGlkYXRpb25UYXJnZXRzLCBkYXRhOiB7fSkge1xuICAgIHRoaXMuI3ZhbGlkYXRlZERhdGFbdGFyZ2V0XSA9IGRhdGFcbiAgfVxuXG4gIHZhbGlkPFQgZXh0ZW5kcyBrZXlvZiBJICYga2V5b2YgVmFsaWRhdGlvblRhcmdldHM+KHRhcmdldDogVCk6IElucHV0VG9EYXRhQnlUYXJnZXQ8SSwgVD5cbiAgdmFsaWQodGFyZ2V0OiBrZXlvZiBWYWxpZGF0aW9uVGFyZ2V0cykge1xuICAgIHJldHVybiB0aGlzLiN2YWxpZGF0ZWREYXRhW3RhcmdldF0gYXMgdW5rbm93blxuICB9XG5cbiAgLyoqXG4gICAqIGAudXJsKClgIGNhbiBnZXQgdGhlIHJlcXVlc3QgdXJsIHN0cmluZ3MuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHRzXG4gICAqIGFwcC5nZXQoJy9hYm91dC9tZScsIChjKSA9PiB7XG4gICAqICAgY29uc3QgdXJsID0gYy5yZXEudXJsIC8vIGBodHRwOi8vbG9jYWxob3N0Ojg3ODcvYWJvdXQvbWVgXG4gICAqICAgLi4uXG4gICAqIH0pXG4gICAqIGBgYFxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL3JlcXVlc3QjdXJsXG4gICAqL1xuICBnZXQgdXJsKCkge1xuICAgIHJldHVybiB0aGlzLnJhdy51cmxcbiAgfVxuXG4gIC8qKlxuICAgKiBgLm1ldGhvZCgpYCBjYW4gZ2V0IHRoZSBtZXRob2QgbmFtZSBvZiB0aGUgcmVxdWVzdC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHNcbiAgICogYXBwLmdldCgnL2Fib3V0L21lJywgKGMpID0+IHtcbiAgICogICBjb25zdCBtZXRob2QgPSBjLnJlcS5tZXRob2QgLy8gYEdFVGBcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvcmVxdWVzdCNtZXRob2RcbiAgICovXG4gIGdldCBtZXRob2QoKSB7XG4gICAgcmV0dXJuIHRoaXMucmF3Lm1ldGhvZFxuICB9XG5cbiAgLyoqXG4gICAqIGAubWF0Y2hlZFJvdXRlcygpYCBjYW4gcmV0dXJuIGEgbWF0Y2hlZCByb3V0ZSBpbiB0aGUgaGFuZGxlclxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBhcHAudXNlKCcqJywgYXN5bmMgZnVuY3Rpb24gbG9nZ2VyKGMsIG5leHQpIHtcbiAgICogICBhd2FpdCBuZXh0KClcbiAgICogICBjLnJlcS5tYXRjaGVkUm91dGVzLmZvckVhY2goKHsgaGFuZGxlciwgbWV0aG9kLCBwYXRoIH0sIGkpID0+IHtcbiAgICogICAgIGNvbnN0IG5hbWUgPSBoYW5kbGVyLm5hbWUgfHwgKGhhbmRsZXIubGVuZ3RoIDwgMiA/ICdbaGFuZGxlcl0nIDogJ1ttaWRkbGV3YXJlXScpXG4gICAqICAgICBjb25zb2xlLmxvZyhcbiAgICogICAgICAgbWV0aG9kLFxuICAgKiAgICAgICAnICcsXG4gICAqICAgICAgIHBhdGgsXG4gICAqICAgICAgICcgJy5yZXBlYXQoTWF0aC5tYXgoMTAgLSBwYXRoLmxlbmd0aCwgMCkpLFxuICAgKiAgICAgICBuYW1lLFxuICAgKiAgICAgICBpID09PSBjLnJlcS5yb3V0ZUluZGV4ID8gJzwtIHJlc3BvbmQgZnJvbSBoZXJlJyA6ICcnXG4gICAqICAgICApXG4gICAqICAgfSlcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvcmVxdWVzdCNtYXRjaGVkcm91dGVzXG4gICAqL1xuICBnZXQgbWF0Y2hlZFJvdXRlcygpOiBSb3V0ZXJSb3V0ZVtdIHtcbiAgICByZXR1cm4gdGhpcy4jbWF0Y2hSZXN1bHRbMF0ubWFwKChbWywgcm91dGVdXSkgPT4gcm91dGUpXG4gIH1cblxuICAvKipcbiAgICogYHJvdXRlUGF0aCgpYCBjYW4gcmV0cmlldmUgdGhlIHBhdGggcmVnaXN0ZXJlZCB3aXRoaW4gdGhlIGhhbmRsZXJcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHNcbiAgICogYXBwLmdldCgnL3Bvc3RzLzppZCcsIChjKSA9PiB7XG4gICAqICAgcmV0dXJuIGMuanNvbih7IHBhdGg6IGMucmVxLnJvdXRlUGF0aCB9KVxuICAgKiB9KVxuICAgKiBgYGBcbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9yZXF1ZXN0I3JvdXRlcGF0aFxuICAgKi9cbiAgZ2V0IHJvdXRlUGF0aCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNtYXRjaFJlc3VsdFswXS5tYXAoKFtbLCByb3V0ZV1dKSA9PiByb3V0ZSlbdGhpcy5yb3V0ZUluZGV4XS5wYXRoXG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQsR0FZckQsU0FBUyxTQUFTLFFBQVEsa0JBQWlCO0FBRzNDLFNBQVMsYUFBYSxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsUUFBUSxpQkFBZ0I7QUFXbkYsT0FBTyxNQUFNO0VBQ1g7Ozs7Ozs7Ozs7O0dBV0MsR0FDRCxJQUFZO0VBRVosQ0FBQSxhQUFjLENBQXlDO0VBQ3ZELENBQUEsV0FBWSxDQUFnQztFQUM1QyxhQUFxQixFQUFDO0VBQ3RCOzs7Ozs7Ozs7R0FTQyxHQUNELEtBQVk7RUFDWixZQUF1QixDQUFDLEVBQUM7RUFFekIsWUFDRSxPQUFnQixFQUNoQixPQUFlLEdBQUcsRUFDbEIsY0FBOEM7SUFBQyxFQUFFO0dBQUMsQ0FDbEQ7SUFDQSxJQUFJLENBQUMsR0FBRyxHQUFHO0lBQ1gsSUFBSSxDQUFDLElBQUksR0FBRztJQUNaLElBQUksQ0FBQyxDQUFBLFdBQVksR0FBRztJQUNwQixJQUFJLENBQUMsQ0FBQSxhQUFjLEdBQUcsQ0FBQztFQUN6QjtFQWdCQSxNQUFNLEdBQVksRUFB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
// denoCacheMetadata=13359359319682921167,8447250642842592250