import { resolveCallback, HtmlEscapedCallbackPhase } from './utils/html.ts';
export const TEXT_PLAIN = 'text/plain; charset=UTF-8';
const setHeaders = (headers, map = {})=>{
  Object.entries(map).forEach(([key, value])=>headers.set(key, value));
  return headers;
};
export class Context {
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */ req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   * @see https://hono.dev/api/context#env
   */ env = {};
  _var = {};
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   * @see https://hono.dev/api/context#error
   */ error = undefined;
  #status = 200;
  #executionCtx;
  #headers = undefined;
  #preparedHeaders = undefined;
  #res;
  #isFresh = true;
  layout = undefined;
  renderer = (content)=>this.html(content);
  notFoundHandler = ()=>new Response();
  constructor(req, options){
    this.req = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      if (options.notFoundHandler) {
        this.notFoundHandler = options.notFoundHandler;
      }
    }
  }
  /**
   * @see https://hono.dev/api/context#event
   */ get event() {
    if (this.#executionCtx && 'respondWith' in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error('This context has no FetchEvent');
    }
  }
  /**
   * @see https://hono.dev/api/context#executionctx
   */ get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error('This context has no ExecutionContext');
    }
  }
  /**
   * @see https://hono.dev/api/context#res
   */ get res() {
    this.#isFresh = false;
    return this.#res ||= new Response('404 Not Found', {
      status: 404
    });
  }
  set res(_res) {
    this.#isFresh = false;
    if (this.#res && _res) {
      this.#res.headers.delete('content-type');
      for (const [k, v] of this.#res.headers.entries()){
        if (k === 'set-cookie') {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete('set-cookie');
          for (const cookie of cookies){
            _res.headers.append('set-cookie', cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   * @see https://hono.dev/api/context#render-setrenderer
   */ render = (...args)=>this.renderer(...args);
  setLayout = (layout)=>this.layout = layout;
  getLayout = ()=>this.layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   * @see https://hono.dev/api/context#render-setrenderer
   */ setRenderer = (renderer)=>{
    this.renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   * @see https://hono.dev/api/context#body
   */ header = (name, value, options)=>{
    // Clear the header
    if (value === undefined) {
      if (this.#headers) {
        this.#headers.delete(name);
      } else if (this.#preparedHeaders) {
        delete this.#preparedHeaders[name.toLocaleLowerCase()];
      }
      if (this.finalized) {
        this.res.headers.delete(name);
      }
      return;
    }
    if (options?.append) {
      if (!this.#headers) {
        this.#isFresh = false;
        this.#headers = new Headers(this.#preparedHeaders);
        this.#preparedHeaders = {};
      }
      this.#headers.append(name, value);
    } else {
      if (this.#headers) {
        this.#headers.set(name, value);
      } else {
        this.#preparedHeaders ??= {};
        this.#preparedHeaders[name.toLowerCase()] = value;
      }
    }
    if (this.finalized) {
      if (options?.append) {
        this.res.headers.append(name, value);
      } else {
        this.res.headers.set(name, value);
      }
    }
  };
  status = (status)=>{
    this.#isFresh = false;
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is cool!!')
   *   await next()
   * })
   * ```
   * @see https://hono.dev/api/context#set-get
```
   */ set = (key, value)=>{
    this._var ??= {};
    this._var[key] = value;
  };
  /**
   * `.get()` can use the value specified by the key.
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   * @see https://hono.dev/api/context#set-get
   */ get = (key)=>{
    return this._var ? this._var[key] : undefined;
  };
  /**
   * `.var` can access the value of a variable.
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   * @see https://hono.dev/api/context#var
   */ // c.var.propName is a read-only
  get var() {
    return {
      ...this._var
    };
  }
  newResponse = (data, arg, headers)=>{
    // Optimized
    if (this.#isFresh && !headers && !arg && this.#status === 200) {
      return new Response(data, {
        headers: this.#preparedHeaders
      });
    }
    if (arg && typeof arg !== 'number') {
      const headers = setHeaders(new Headers(arg.headers), this.#preparedHeaders);
      return new Response(data, {
        headers,
        status: arg.status ?? this.#status
      });
    }
    const status = typeof arg === 'number' ? arg : this.#status;
    this.#preparedHeaders ??= {};
    this.#headers ??= new Headers();
    setHeaders(this.#headers, this.#preparedHeaders);
    if (this.#res) {
      this.#res.headers.forEach((v, k)=>{
        this.#headers?.set(k, v);
      });
      setHeaders(this.#headers, this.#preparedHeaders);
    }
    headers ??= {};
    for (const [k, v] of Object.entries(headers)){
      if (typeof v === 'string') {
        this.#headers.set(k, v);
      } else {
        this.#headers.delete(k);
        for (const v2 of v){
          this.#headers.append(k, v2);
        }
      }
    }
    return new Response(data, {
      status,
      headers: this.#headers
    });
  };
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   * @see https://hono.dev/api/context#body
   */ body = (data, arg, headers)=>{
    return typeof arg === 'number' ? this.newResponse(data, arg, headers) : this.newResponse(data, arg);
  };
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   * @see https://hono.dev/api/context#text
   */ text = (text, arg, headers)=>{
    // If the header is empty, return Response immediately.
    // Content-Type will be added automatically as `text/plain`.
    if (!this.#preparedHeaders) {
      if (this.#isFresh && !headers && !arg) {
        return new Response(text);
      }
      this.#preparedHeaders = {};
    }
    this.#preparedHeaders['content-type'] = TEXT_PLAIN;
    return typeof arg === 'number' ? this.newResponse(text, arg, headers) : this.newResponse(text, arg);
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   * @see https://hono.dev/api/context#json
   */ json = (object, arg, headers)=>{
    const body = JSON.stringify(object);
    this.#preparedHeaders ??= {};
    this.#preparedHeaders['content-type'] = 'application/json; charset=UTF-8';
    /* eslint-disable @typescript-eslint/no-explicit-any */ return typeof arg === 'number' ? this.newResponse(body, arg, headers) : this.newResponse(body, arg);
  };
  html = (html, arg, headers)=>{
    this.#preparedHeaders ??= {};
    this.#preparedHeaders['content-type'] = 'text/html; charset=UTF-8';
    if (typeof html === 'object') {
      if (!(html instanceof Promise)) {
        html = html.toString(); // HtmlEscapedString object to string
      }
      if (html instanceof Promise) {
        return html.then((html)=>resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {})).then((html)=>{
          return typeof arg === 'number' ? this.newResponse(html, arg, headers) : this.newResponse(html, arg);
        });
      }
    }
    return typeof arg === 'number' ? this.newResponse(html, arg, headers) : this.newResponse(html, arg);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   * @see https://hono.dev/api/context#redirect
   */ redirect = (location, status = 302)=>{
    this.#headers ??= new Headers();
    this.#headers.set('Location', location);
    return this.newResponse(null, status);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   * @see https://hono.dev/api/context#notfound
   */ notFound = ()=>{
    return this.notFoundHandler(this);
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9ob25vL2Rlbm9fZGlzdC9jb250ZXh0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgSG9ub1JlcXVlc3QgfSBmcm9tICcuL3JlcXVlc3QudHMnXG5pbXBvcnQgdHlwZSB7IEVudiwgRmV0Y2hFdmVudExpa2UsIE5vdEZvdW5kSGFuZGxlciwgSW5wdXQsIFR5cGVkUmVzcG9uc2UgfSBmcm9tICcuL3R5cGVzLnRzJ1xuaW1wb3J0IHsgcmVzb2x2ZUNhbGxiYWNrLCBIdG1sRXNjYXBlZENhbGxiYWNrUGhhc2UgfSBmcm9tICcuL3V0aWxzL2h0bWwudHMnXG5pbXBvcnQgdHlwZSB7IFJlZGlyZWN0U3RhdHVzQ29kZSwgU3RhdHVzQ29kZSB9IGZyb20gJy4vdXRpbHMvaHR0cC1zdGF0dXMudHMnXG5pbXBvcnQgdHlwZSB7IEpTT05WYWx1ZSwgSW50ZXJmYWNlVG9UeXBlLCBKU09OUGFyc2VkLCBJc0FueSB9IGZyb20gJy4vdXRpbHMvdHlwZXMudHMnXG5cbnR5cGUgSGVhZGVyUmVjb3JkID0gUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgc3RyaW5nW10+XG50eXBlIERhdGEgPSBzdHJpbmcgfCBBcnJheUJ1ZmZlciB8IFJlYWRhYmxlU3RyZWFtXG5cbmV4cG9ydCBpbnRlcmZhY2UgRXhlY3V0aW9uQ29udGV4dCB7XG4gIHdhaXRVbnRpbChwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogdm9pZFxuICBwYXNzVGhyb3VnaE9uRXhjZXB0aW9uKCk6IHZvaWRcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb250ZXh0VmFyaWFibGVNYXAge31cblxuZXhwb3J0IGludGVyZmFjZSBDb250ZXh0UmVuZGVyZXIge31cbmludGVyZmFjZSBEZWZhdWx0UmVuZGVyZXIge1xuICAoY29udGVudDogc3RyaW5nIHwgUHJvbWlzZTxzdHJpbmc+KTogUmVzcG9uc2UgfCBQcm9taXNlPFJlc3BvbnNlPlxufVxuXG5leHBvcnQgdHlwZSBSZW5kZXJlciA9IENvbnRleHRSZW5kZXJlciBleHRlbmRzIEZ1bmN0aW9uID8gQ29udGV4dFJlbmRlcmVyIDogRGVmYXVsdFJlbmRlcmVyXG5leHBvcnQgdHlwZSBQcm9wc0ZvclJlbmRlcmVyID0gWy4uLlJlcXVpcmVkPFBhcmFtZXRlcnM8UmVuZGVyZXI+Pl0gZXh0ZW5kcyBbdW5rbm93biwgaW5mZXIgUHJvcHNdXG4gID8gUHJvcHNcbiAgOiB1bmtub3duXG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5leHBvcnQgdHlwZSBMYXlvdXQ8VCA9IFJlY29yZDxzdHJpbmcsIGFueT4+ID0gKHByb3BzOiBUKSA9PiBhbnlcblxuaW50ZXJmYWNlIEdldDxFIGV4dGVuZHMgRW52PiB7XG4gIDxLZXkgZXh0ZW5kcyBrZXlvZiBDb250ZXh0VmFyaWFibGVNYXA+KGtleTogS2V5KTogQ29udGV4dFZhcmlhYmxlTWFwW0tleV1cbiAgPEtleSBleHRlbmRzIGtleW9mIEVbJ1ZhcmlhYmxlcyddPihrZXk6IEtleSk6IEVbJ1ZhcmlhYmxlcyddW0tleV1cbn1cblxuaW50ZXJmYWNlIFNldDxFIGV4dGVuZHMgRW52PiB7XG4gIDxLZXkgZXh0ZW5kcyBrZXlvZiBDb250ZXh0VmFyaWFibGVNYXA+KGtleTogS2V5LCB2YWx1ZTogQ29udGV4dFZhcmlhYmxlTWFwW0tleV0pOiB2b2lkXG4gIDxLZXkgZXh0ZW5kcyBrZXlvZiBFWydWYXJpYWJsZXMnXT4oa2V5OiBLZXksIHZhbHVlOiBFWydWYXJpYWJsZXMnXVtLZXldKTogdm9pZFxufVxuXG5pbnRlcmZhY2UgTmV3UmVzcG9uc2Uge1xuICAoZGF0YTogRGF0YSB8IG51bGwsIHN0YXR1cz86IFN0YXR1c0NvZGUsIGhlYWRlcnM/OiBIZWFkZXJSZWNvcmQpOiBSZXNwb25zZVxuICAoZGF0YTogRGF0YSB8IG51bGwsIGluaXQ/OiBSZXNwb25zZUluaXQpOiBSZXNwb25zZVxufVxuXG5pbnRlcmZhY2UgQm9keVJlc3BvbmQgZXh0ZW5kcyBOZXdSZXNwb25zZSB7fVxuXG5pbnRlcmZhY2UgVGV4dFJlc3BvbmQge1xuICAodGV4dDogc3RyaW5nLCBzdGF0dXM/OiBTdGF0dXNDb2RlLCBoZWFkZXJzPzogSGVhZGVyUmVjb3JkKTogUmVzcG9uc2VcbiAgKHRleHQ6IHN0cmluZywgaW5pdD86IFJlc3BvbnNlSW5pdCk6IFJlc3BvbnNlXG59XG5cbmludGVyZmFjZSBKU09OUmVzcG9uZCB7XG4gIDxUPihcbiAgICBvYmplY3Q6IEludGVyZmFjZVRvVHlwZTxUPiBleHRlbmRzIEpTT05WYWx1ZSA/IFQgOiBKU09OVmFsdWUsXG4gICAgc3RhdHVzPzogU3RhdHVzQ29kZSxcbiAgICBoZWFkZXJzPzogSGVhZGVyUmVjb3JkXG4gICk6IFJlc3BvbnNlICZcbiAgICBUeXBlZFJlc3BvbnNlPFxuICAgICAgSW50ZXJmYWNlVG9UeXBlPFQ+IGV4dGVuZHMgSlNPTlZhbHVlXG4gICAgICAgID8gSlNPTlZhbHVlIGV4dGVuZHMgSW50ZXJmYWNlVG9UeXBlPFQ+XG4gICAgICAgICAgPyBuZXZlclxuICAgICAgICAgIDogSlNPTlBhcnNlZDxUPlxuICAgICAgICA6IG5ldmVyXG4gICAgPlxuICA8VD4ob2JqZWN0OiBJbnRlcmZhY2VUb1R5cGU8VD4gZXh0ZW5kcyBKU09OVmFsdWUgPyBUIDogSlNPTlZhbHVlLCBpbml0PzogUmVzcG9uc2VJbml0KTogUmVzcG9uc2UgJlxuICAgIFR5cGVkUmVzcG9uc2U8XG4gICAgICBJbnRlcmZhY2VUb1R5cGU8VD4gZXh0ZW5kcyBKU09OVmFsdWVcbiAgICAgICAgPyBKU09OVmFsdWUgZXh0ZW5kcyBJbnRlcmZhY2VUb1R5cGU8VD5cbiAgICAgICAgICA/IG5ldmVyXG4gICAgICAgICAgOiBKU09OUGFyc2VkPFQ+XG4gICAgICAgIDogbmV2ZXJcbiAgICA+XG59XG5cbmludGVyZmFjZSBIVE1MUmVzcG9uZCB7XG4gIChodG1sOiBzdHJpbmcgfCBQcm9taXNlPHN0cmluZz4sIHN0YXR1cz86IFN0YXR1c0NvZGUsIGhlYWRlcnM/OiBIZWFkZXJSZWNvcmQpOlxuICAgIHwgUmVzcG9uc2VcbiAgICB8IFByb21pc2U8UmVzcG9uc2U+XG4gIChodG1sOiBzdHJpbmcgfCBQcm9taXNlPHN0cmluZz4sIGluaXQ/OiBSZXNwb25zZUluaXQpOiBSZXNwb25zZSB8IFByb21pc2U8UmVzcG9uc2U+XG59XG5cbnR5cGUgQ29udGV4dE9wdGlvbnM8RSBleHRlbmRzIEVudj4gPSB7XG4gIGVudjogRVsnQmluZGluZ3MnXVxuICBleGVjdXRpb25DdHg/OiBGZXRjaEV2ZW50TGlrZSB8IEV4ZWN1dGlvbkNvbnRleHQgfCB1bmRlZmluZWRcbiAgbm90Rm91bmRIYW5kbGVyPzogTm90Rm91bmRIYW5kbGVyPEU+XG59XG5cbmV4cG9ydCBjb25zdCBURVhUX1BMQUlOID0gJ3RleHQvcGxhaW47IGNoYXJzZXQ9VVRGLTgnXG5cbmNvbnN0IHNldEhlYWRlcnMgPSAoaGVhZGVyczogSGVhZGVycywgbWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge30pID0+IHtcbiAgT2JqZWN0LmVudHJpZXMobWFwKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IGhlYWRlcnMuc2V0KGtleSwgdmFsdWUpKVxuICByZXR1cm4gaGVhZGVyc1xufVxuXG5leHBvcnQgY2xhc3MgQ29udGV4dDxcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgRSBleHRlbmRzIEVudiA9IGFueSxcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgUCBleHRlbmRzIHN0cmluZyA9IGFueSxcbiAgSSBleHRlbmRzIElucHV0ID0ge31cbj4ge1xuICAvKipcbiAgICogYC5yZXFgIGlzIHRoZSBpbnN0YW5jZSBvZiB7QGxpbmsgSG9ub1JlcXVlc3R9LlxuICAgKi9cbiAgcmVxOiBIb25vUmVxdWVzdDxQLCBJWydvdXQnXT5cbiAgLyoqXG4gICAqIGAuZW52YCBjYW4gZ2V0IGJpbmRpbmdzIChlbnZpcm9ubWVudCB2YXJpYWJsZXMsIHNlY3JldHMsIEtWIG5hbWVzcGFjZXMsIEQxIGRhdGFiYXNlLCBSMiBidWNrZXQgZXRjLikgaW4gQ2xvdWRmbGFyZSBXb3JrZXJzLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiAvLyBFbnZpcm9ubWVudCBvYmplY3QgZm9yIENsb3VkZmxhcmUgV29ya2Vyc1xuICAgKiBhcHAuZ2V0KCcqJywgYXN5bmMgYyA9PiB7XG4gICAqICAgY29uc3QgY291bnRlciA9IGMuZW52LkNPVU5URVJcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvY29udGV4dCNlbnZcbiAgICovXG4gIGVudjogRVsnQmluZGluZ3MnXSA9IHt9XG4gIHByaXZhdGUgX3ZhcjogRVsnVmFyaWFibGVzJ10gPSB7fVxuICBmaW5hbGl6ZWQ6IGJvb2xlYW4gPSBmYWxzZVxuICAvKipcbiAgICogYC5lcnJvcmAgY2FuIGdldCB0aGUgZXJyb3Igb2JqZWN0IGZyb20gdGhlIG1pZGRsZXdhcmUgaWYgdGhlIEhhbmRsZXIgdGhyb3dzIGFuIGVycm9yLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBhcHAudXNlKCcqJywgYXN5bmMgKGMsIG5leHQpID0+IHtcbiAgICogICBhd2FpdCBuZXh0KClcbiAgICogICBpZiAoYy5lcnJvcikge1xuICAgKiAgICAgLy8gZG8gc29tZXRoaW5nLi4uXG4gICAqICAgfVxuICAgKiB9KVxuICAgKiBgYGBcbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9jb250ZXh0I2Vycm9yXG4gICAqL1xuICBlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICAjc3RhdHVzOiBTdGF0dXNDb2RlID0gMjAwXG4gICNleGVjdXRpb25DdHg6IEZldGNoRXZlbnRMaWtlIHwgRXhlY3V0aW9uQ29udGV4dCB8IHVuZGVmaW5lZFxuICAjaGVhZGVyczogSGVhZGVycyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuICAjcHJlcGFyZWRIZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICNyZXM6IFJlc3BvbnNlIHwgdW5kZWZpbmVkXG4gICNpc0ZyZXNoID0gdHJ1ZVxuICBwcml2YXRlIGxheW91dDogTGF5b3V0PFByb3BzRm9yUmVuZGVyZXIgJiB7IExheW91dDogTGF5b3V0IH0+IHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyID0gKGNvbnRlbnQ6IHN0cmluZyB8IFByb21pc2U8c3RyaW5nPikgPT4gdGhpcy5odG1sKGNvbnRlbnQpXG4gIHByaXZhdGUgbm90Rm91bmRIYW5kbGVyOiBOb3RGb3VuZEhhbmRsZXI8RT4gPSAoKSA9PiBuZXcgUmVzcG9uc2UoKVxuXG4gIGNvbnN0cnVjdG9yKHJlcTogSG9ub1JlcXVlc3Q8UCwgSVsnb3V0J10+LCBvcHRpb25zPzogQ29udGV4dE9wdGlvbnM8RT4pIHtcbiAgICB0aGlzLnJlcSA9IHJlcVxuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICB0aGlzLiNleGVjdXRpb25DdHggPSBvcHRpb25zLmV4ZWN1dGlvbkN0eFxuICAgICAgdGhpcy5lbnYgPSBvcHRpb25zLmVudlxuICAgICAgaWYgKG9wdGlvbnMubm90Rm91bmRIYW5kbGVyKSB7XG4gICAgICAgIHRoaXMubm90Rm91bmRIYW5kbGVyID0gb3B0aW9ucy5ub3RGb3VuZEhhbmRsZXJcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9jb250ZXh0I2V2ZW50XG4gICAqL1xuICBnZXQgZXZlbnQoKTogRmV0Y2hFdmVudExpa2Uge1xuICAgIGlmICh0aGlzLiNleGVjdXRpb25DdHggJiYgJ3Jlc3BvbmRXaXRoJyBpbiB0aGlzLiNleGVjdXRpb25DdHgpIHtcbiAgICAgIHJldHVybiB0aGlzLiNleGVjdXRpb25DdHhcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgRXJyb3IoJ1RoaXMgY29udGV4dCBoYXMgbm8gRmV0Y2hFdmVudCcpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvY29udGV4dCNleGVjdXRpb25jdHhcbiAgICovXG4gIGdldCBleGVjdXRpb25DdHgoKTogRXhlY3V0aW9uQ29udGV4dCB7XG4gICAgaWYgKHRoaXMuI2V4ZWN1dGlvbkN0eCkge1xuICAgICAgcmV0dXJuIHRoaXMuI2V4ZWN1dGlvbkN0eCBhcyBFeGVjdXRpb25Db250ZXh0XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKCdUaGlzIGNvbnRleHQgaGFzIG5vIEV4ZWN1dGlvbkNvbnRleHQnKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL2NvbnRleHQjcmVzXG4gICAqL1xuICBnZXQgcmVzKCk6IFJlc3BvbnNlIHtcbiAgICB0aGlzLiNpc0ZyZXNoID0gZmFsc2VcbiAgICByZXR1cm4gKHRoaXMuI3JlcyB8fD0gbmV3IFJlc3BvbnNlKCc0MDQgTm90IEZvdW5kJywgeyBzdGF0dXM6IDQwNCB9KSlcbiAgfVxuXG4gIHNldCByZXMoX3JlczogUmVzcG9uc2UgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLiNpc0ZyZXNoID0gZmFsc2VcbiAgICBpZiAodGhpcy4jcmVzICYmIF9yZXMpIHtcbiAgICAgIHRoaXMuI3Jlcy5oZWFkZXJzLmRlbGV0ZSgnY29udGVudC10eXBlJylcbiAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHRoaXMuI3Jlcy5oZWFkZXJzLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoayA9PT0gJ3NldC1jb29raWUnKSB7XG4gICAgICAgICAgY29uc3QgY29va2llcyA9IHRoaXMuI3Jlcy5oZWFkZXJzLmdldFNldENvb2tpZSgpXG4gICAgICAgICAgX3Jlcy5oZWFkZXJzLmRlbGV0ZSgnc2V0LWNvb2tpZScpXG4gICAgICAgICAgZm9yIChjb25zdCBjb29raWUgb2YgY29va2llcykge1xuICAgICAgICAgICAgX3Jlcy5oZWFkZXJzLmFwcGVuZCgnc2V0LWNvb2tpZScsIGNvb2tpZSlcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3Jlcy5oZWFkZXJzLnNldChrLCB2KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuI3JlcyA9IF9yZXNcbiAgICB0aGlzLmZpbmFsaXplZCA9IHRydWVcbiAgfVxuXG4gIC8qKlxuICAgKiBgLnJlbmRlcigpYCBjYW4gY3JlYXRlIGEgcmVzcG9uc2Ugd2l0aGluIGEgbGF5b3V0LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBhcHAuZ2V0KCcvJywgKGMpID0+IHtcbiAgICogICByZXR1cm4gYy5yZW5kZXIoJ0hlbGxvIScpXG4gICAqIH0pXG4gICAqIGBgYFxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL2NvbnRleHQjcmVuZGVyLXNldHJlbmRlcmVyXG4gICAqL1xuICByZW5kZXI6IFJlbmRlcmVyID0gKC4uLmFyZ3MpID0+IHRoaXMucmVuZGVyZXIoLi4uYXJncylcblxuICBzZXRMYXlvdXQgPSAobGF5b3V0OiBMYXlvdXQ8UHJvcHNGb3JSZW5kZXJlciAmIHsgTGF5b3V0OiBMYXlvdXQgfT4pID0+ICh0aGlzLmxheW91dCA9IGxheW91dClcbiAgZ2V0TGF5b3V0ID0gKCkgPT4gdGhpcy5sYXlvdXRcblxuICAvKipcbiAgICogYC5zZXRSZW5kZXJlcigpYCBjYW4gc2V0IHRoZSBsYXlvdXQgaW4gdGhlIGN1c3RvbSBtaWRkbGV3YXJlLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c3hcbiAgICogYXBwLnVzZSgnKicsIGFzeW5jIChjLCBuZXh0KSA9PiB7XG4gICAqICAgYy5zZXRSZW5kZXJlcigoY29udGVudCkgPT4ge1xuICAgKiAgICAgcmV0dXJuIGMuaHRtbChcbiAgICogICAgICAgPGh0bWw+XG4gICAqICAgICAgICAgPGJvZHk+XG4gICAqICAgICAgICAgICA8cD57Y29udGVudH08L3A+XG4gICAqICAgICAgICAgPC9ib2R5PlxuICAgKiAgICAgICA8L2h0bWw+XG4gICAqICAgICApXG4gICAqICAgfSlcbiAgICogICBhd2FpdCBuZXh0KClcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvY29udGV4dCNyZW5kZXItc2V0cmVuZGVyZXJcbiAgICovXG4gIHNldFJlbmRlcmVyID0gKHJlbmRlcmVyOiBSZW5kZXJlcikgPT4ge1xuICAgIHRoaXMucmVuZGVyZXIgPSByZW5kZXJlclxuICB9XG5cbiAgLyoqXG4gICAqIGAuaGVhZGVyKClgIGNhbiBzZXQgaGVhZGVycy5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHNcbiAgICogYXBwLmdldCgnL3dlbGNvbWUnLCAoYykgPT4ge1xuICAgKiAgIC8vIFNldCBoZWFkZXJzXG4gICAqICAgYy5oZWFkZXIoJ1gtTWVzc2FnZScsICdIZWxsbyEnKVxuICAgKiAgIGMuaGVhZGVyKCdDb250ZW50LVR5cGUnLCAndGV4dC9wbGFpbicpXG4gICAqXG4gICAqICAgcmV0dXJuIGMuYm9keSgnVGhhbmsgeW91IGZvciBjb21pbmcnKVxuICAgKiB9KVxuICAgKiBgYGBcbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9jb250ZXh0I2JvZHlcbiAgICovXG4gIGhlYWRlciA9IChuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM/OiB7IGFwcGVuZD86IGJvb2xlYW4gfSk6IHZvaWQgPT4ge1xuICAgIC8vIENsZWFyIHRoZSBoZWFkZXJcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHRoaXMuI2hlYWRlcnMpIHtcbiAgICAgICAgdGhpcy4jaGVhZGVycy5kZWxldGUobmFtZSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy4jcHJlcGFyZWRIZWFkZXJzKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLiNwcmVwYXJlZEhlYWRlcnNbbmFtZS50b0xvY2FsZUxvd2VyQ2FzZSgpXVxuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZmluYWxpemVkKSB7XG4gICAgICAgIHRoaXMucmVzLmhlYWRlcnMuZGVsZXRlKG5hbWUpXG4gICAgICB9XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucz8uYXBwZW5kKSB7XG4gICAgICBpZiAoIXRoaXMuI2hlYWRlcnMpIHtcbiAgICAgICAgdGhpcy4jaXNGcmVzaCA9IGZhbHNlXG4gICAgICAgIHRoaXMuI2hlYWRlcnMgPSBuZXcgSGVhZGVycyh0aGlzLiNwcmVwYXJlZEhlYWRlcnMpXG4gICAgICAgIHRoaXMuI3ByZXBhcmVkSGVhZGVycyA9IHt9XG4gICAgICB9XG4gICAgICB0aGlzLiNoZWFkZXJzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuI2hlYWRlcnMpIHtcbiAgICAgICAgdGhpcy4jaGVhZGVycy5zZXQobmFtZSwgdmFsdWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLiNwcmVwYXJlZEhlYWRlcnMgPz89IHt9XG4gICAgICAgIHRoaXMuI3ByZXBhcmVkSGVhZGVyc1tuYW1lLnRvTG93ZXJDYXNlKCldID0gdmFsdWVcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5maW5hbGl6ZWQpIHtcbiAgICAgIGlmIChvcHRpb25zPy5hcHBlbmQpIHtcbiAgICAgICAgdGhpcy5yZXMuaGVhZGVycy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlcy5oZWFkZXJzLnNldChuYW1lLCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdGF0dXMgPSAoc3RhdHVzOiBTdGF0dXNDb2RlKTogdm9pZCA9PiB7XG4gICAgdGhpcy4jaXNGcmVzaCA9IGZhbHNlXG4gICAgdGhpcy4jc3RhdHVzID0gc3RhdHVzXG4gIH1cblxuICAvKipcbiAgICogYC5zZXQoKWAgY2FuIHNldCB0aGUgdmFsdWUgc3BlY2lmaWVkIGJ5IHRoZSBrZXkuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHRzXG4gICAqIGFwcC51c2UoJyonLCBhc3luYyAoYywgbmV4dCkgPT4ge1xuICAgKiAgIGMuc2V0KCdtZXNzYWdlJywgJ0hvbm8gaXMgY29vbCEhJylcbiAgICogICBhd2FpdCBuZXh0KClcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvY29udGV4dCNzZXQtZ2V0XG5gYGBcbiAgICovXG4gIHNldDogU2V0PEU+ID0gKGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4ge1xuICAgIHRoaXMuX3ZhciA/Pz0ge31cbiAgICB0aGlzLl92YXJba2V5IGFzIHN0cmluZ10gPSB2YWx1ZVxuICB9XG5cbiAgLyoqXG4gICAqIGAuZ2V0KClgIGNhbiB1c2UgdGhlIHZhbHVlIHNwZWNpZmllZCBieSB0aGUga2V5LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBhcHAuZ2V0KCcvJywgKGMpID0+IHtcbiAgICogICBjb25zdCBtZXNzYWdlID0gYy5nZXQoJ21lc3NhZ2UnKVxuICAgKiAgIHJldHVybiBjLnRleHQoYFRoZSBtZXNzYWdlIGlzIFwiJHttZXNzYWdlfVwiYClcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvY29udGV4dCNzZXQtZ2V0XG4gICAqL1xuICBnZXQ6IEdldDxFPiA9IChrZXk6IHN0cmluZykgPT4ge1xuICAgIHJldHVybiB0aGlzLl92YXIgPyB0aGlzLl92YXJba2V5XSA6IHVuZGVmaW5lZFxuICB9XG5cbiAgLyoqXG4gICAqIGAudmFyYCBjYW4gYWNjZXNzIHRoZSB2YWx1ZSBvZiBhIHZhcmlhYmxlLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBjb25zdCByZXN1bHQgPSBjLnZhci5jbGllbnQub25lTWV0aG9kKClcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvY29udGV4dCN2YXJcbiAgICovXG4gIC8vIGMudmFyLnByb3BOYW1lIGlzIGEgcmVhZC1vbmx5XG4gIGdldCB2YXIoKTogUmVhZG9ubHk8XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBDb250ZXh0VmFyaWFibGVNYXAgJiAoSXNBbnk8RVsnVmFyaWFibGVzJ10+IGV4dGVuZHMgdHJ1ZSA/IFJlY29yZDxzdHJpbmcsIGFueT4gOiBFWydWYXJpYWJsZXMnXSlcbiAgPiB7XG4gICAgcmV0dXJuIHsgLi4udGhpcy5fdmFyIH0gYXMgbmV2ZXJcbiAgfVxuXG4gIG5ld1Jlc3BvbnNlOiBOZXdSZXNwb25zZSA9IChcbiAgICBkYXRhOiBEYXRhIHwgbnVsbCxcbiAgICBhcmc/OiBTdGF0dXNDb2RlIHwgUmVzcG9uc2VJbml0LFxuICAgIGhlYWRlcnM/OiBIZWFkZXJSZWNvcmRcbiAgKTogUmVzcG9uc2UgPT4ge1xuICAgIC8vIE9wdGltaXplZFxuICAgIGlmICh0aGlzLiNpc0ZyZXNoICYmICFoZWFkZXJzICYmICFhcmcgJiYgdGhpcy4jc3RhdHVzID09PSAyMDApIHtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoZGF0YSwge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLiNwcmVwYXJlZEhlYWRlcnMsXG4gICAgICB9KVxuICAgIH1cblxuICAgIGlmIChhcmcgJiYgdHlwZW9mIGFyZyAhPT0gJ251bWJlcicpIHtcbiAgICAgIGNvbnN0IGhlYWRlcnMgPSBzZXRIZWFkZXJzKG5ldyBIZWFkZXJzKGFyZy5oZWFkZXJzKSwgdGhpcy4jcHJlcGFyZWRIZWFkZXJzKVxuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShkYXRhLCB7XG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIHN0YXR1czogYXJnLnN0YXR1cyA/PyB0aGlzLiNzdGF0dXMsXG4gICAgICB9KVxuICAgIH1cblxuICAgIGNvbnN0IHN0YXR1cyA9IHR5cGVvZiBhcmcgPT09ICdudW1iZXInID8gYXJnIDogdGhpcy4jc3RhdHVzXG4gICAgdGhpcy4jcHJlcGFyZWRIZWFkZXJzID8/PSB7fVxuXG4gICAgdGhpcy4jaGVhZGVycyA/Pz0gbmV3IEhlYWRlcnMoKVxuICAgIHNldEhlYWRlcnModGhpcy4jaGVhZGVycywgdGhpcy4jcHJlcGFyZWRIZWFkZXJzKVxuXG4gICAgaWYgKHRoaXMuI3Jlcykge1xuICAgICAgdGhpcy4jcmVzLmhlYWRlcnMuZm9yRWFjaCgodiwgaykgPT4ge1xuICAgICAgICB0aGlzLiNoZWFkZXJzPy5zZXQoaywgdilcbiAgICAgIH0pXG4gICAgICBzZXRIZWFkZXJzKHRoaXMuI2hlYWRlcnMsIHRoaXMuI3ByZXBhcmVkSGVhZGVycylcbiAgICB9XG5cbiAgICBoZWFkZXJzID8/PSB7fVxuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGhlYWRlcnMpKSB7XG4gICAgICBpZiAodHlwZW9mIHYgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuI2hlYWRlcnMuc2V0KGssIHYpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLiNoZWFkZXJzLmRlbGV0ZShrKVxuICAgICAgICBmb3IgKGNvbnN0IHYyIG9mIHYpIHtcbiAgICAgICAgICB0aGlzLiNoZWFkZXJzLmFwcGVuZChrLCB2MilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoZGF0YSwge1xuICAgICAgc3RhdHVzLFxuICAgICAgaGVhZGVyczogdGhpcy4jaGVhZGVycyxcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIGAuYm9keSgpYCBjYW4gcmV0dXJuIHRoZSBIVFRQIHJlc3BvbnNlLlxuICAgKiBZb3UgY2FuIHNldCBoZWFkZXJzIHdpdGggYC5oZWFkZXIoKWAgYW5kIHNldCBIVFRQIHN0YXR1cyBjb2RlIHdpdGggYC5zdGF0dXNgLlxuICAgKiBUaGlzIGNhbiBhbHNvIGJlIHNldCBpbiBgLnRleHQoKWAsIGAuanNvbigpYCBhbmQgc28gb24uXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHRzXG4gICAqIGFwcC5nZXQoJy93ZWxjb21lJywgKGMpID0+IHtcbiAgICogICAvLyBTZXQgaGVhZGVyc1xuICAgKiAgIGMuaGVhZGVyKCdYLU1lc3NhZ2UnLCAnSGVsbG8hJylcbiAgICogICBjLmhlYWRlcignQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKVxuICAgKiAgIC8vIFNldCBIVFRQIHN0YXR1cyBjb2RlXG4gICAqICAgYy5zdGF0dXMoMjAxKVxuICAgKlxuICAgKiAgIC8vIFJldHVybiB0aGUgcmVzcG9uc2UgYm9keVxuICAgKiAgIHJldHVybiBjLmJvZHkoJ1RoYW5rIHlvdSBmb3IgY29taW5nJylcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvY29udGV4dCNib2R5XG4gICAqL1xuICBib2R5OiBCb2R5UmVzcG9uZCA9IChcbiAgICBkYXRhOiBEYXRhIHwgbnVsbCxcbiAgICBhcmc/OiBTdGF0dXNDb2RlIHwgUmVzcG9uc2VJbml0LFxuICAgIGhlYWRlcnM/OiBIZWFkZXJSZWNvcmRcbiAgKTogUmVzcG9uc2UgPT4ge1xuICAgIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJ1xuICAgICAgPyB0aGlzLm5ld1Jlc3BvbnNlKGRhdGEsIGFyZywgaGVhZGVycylcbiAgICAgIDogdGhpcy5uZXdSZXNwb25zZShkYXRhLCBhcmcpXG4gIH1cblxuICAvKipcbiAgICogYC50ZXh0KClgIGNhbiByZW5kZXIgdGV4dCBhcyBgQ29udGVudC1UeXBlOnRleHQvcGxhaW5gLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBhcHAuZ2V0KCcvc2F5JywgKGMpID0+IHtcbiAgICogICByZXR1cm4gYy50ZXh0KCdIZWxsbyEnKVxuICAgKiB9KVxuICAgKiBgYGBcbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9jb250ZXh0I3RleHRcbiAgICovXG4gIHRleHQ6IFRleHRSZXNwb25kID0gKFxuICAgIHRleHQ6IHN0cmluZyxcbiAgICBhcmc/OiBTdGF0dXNDb2RlIHwgUmVzcG9uc2VJbml0LFxuICAgIGhlYWRlcnM/OiBIZWFkZXJSZWNvcmRcbiAgKTogUmVzcG9uc2UgPT4ge1xuICAgIC8vIElmIHRoZSBoZWFkZXIgaXMgZW1wdHksIHJldHVybiBSZXNwb25zZSBpbW1lZGlhdGVseS5cbiAgICAvLyBDb250ZW50LVR5cGUgd2lsbCBiZSBhZGRlZCBhdXRvbWF0aWNhbGx5IGFzIGB0ZXh0L3BsYWluYC5cbiAgICBpZiAoIXRoaXMuI3ByZXBhcmVkSGVhZGVycykge1xuICAgICAgaWYgKHRoaXMuI2lzRnJlc2ggJiYgIWhlYWRlcnMgJiYgIWFyZykge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRleHQpXG4gICAgICB9XG4gICAgICB0aGlzLiNwcmVwYXJlZEhlYWRlcnMgPSB7fVxuICAgIH1cbiAgICB0aGlzLiNwcmVwYXJlZEhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddID0gVEVYVF9QTEFJTlxuICAgIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJ1xuICAgICAgPyB0aGlzLm5ld1Jlc3BvbnNlKHRleHQsIGFyZywgaGVhZGVycylcbiAgICAgIDogdGhpcy5uZXdSZXNwb25zZSh0ZXh0LCBhcmcpXG4gIH1cblxuICAvKipcbiAgICogYC5qc29uKClgIGNhbiByZW5kZXIgSlNPTiBhcyBgQ29udGVudC1UeXBlOmFwcGxpY2F0aW9uL2pzb25gLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBhcHAuZ2V0KCcvYXBpJywgKGMpID0+IHtcbiAgICogICByZXR1cm4gYy5qc29uKHsgbWVzc2FnZTogJ0hlbGxvIScgfSlcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvY29udGV4dCNqc29uXG4gICAqL1xuICBqc29uOiBKU09OUmVzcG9uZCA9IDxUPihcbiAgICBvYmplY3Q6IEludGVyZmFjZVRvVHlwZTxUPiBleHRlbmRzIEpTT05WYWx1ZSA/IFQgOiBKU09OVmFsdWUsXG4gICAgYXJnPzogU3RhdHVzQ29kZSB8IFJlc3BvbnNlSW5pdCxcbiAgICBoZWFkZXJzPzogSGVhZGVyUmVjb3JkXG4gICk6IFJlc3BvbnNlICZcbiAgICBUeXBlZFJlc3BvbnNlPFxuICAgICAgSW50ZXJmYWNlVG9UeXBlPFQ+IGV4dGVuZHMgSlNPTlZhbHVlXG4gICAgICAgID8gSlNPTlZhbHVlIGV4dGVuZHMgSW50ZXJmYWNlVG9UeXBlPFQ+XG4gICAgICAgICAgPyBuZXZlclxuICAgICAgICAgIDogSlNPTlBhcnNlZDxUPlxuICAgICAgICA6IG5ldmVyXG4gICAgPiA9PiB7XG4gICAgY29uc3QgYm9keSA9IEpTT04uc3RyaW5naWZ5KG9iamVjdClcbiAgICB0aGlzLiNwcmVwYXJlZEhlYWRlcnMgPz89IHt9XG4gICAgdGhpcy4jcHJlcGFyZWRIZWFkZXJzWydjb250ZW50LXR5cGUnXSA9ICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04J1xuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cbiAgICByZXR1cm4gKFxuICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgPyB0aGlzLm5ld1Jlc3BvbnNlKGJvZHksIGFyZywgaGVhZGVycykgOiB0aGlzLm5ld1Jlc3BvbnNlKGJvZHksIGFyZylcbiAgICApIGFzIGFueVxuICB9XG5cbiAgaHRtbDogSFRNTFJlc3BvbmQgPSAoXG4gICAgaHRtbDogc3RyaW5nIHwgUHJvbWlzZTxzdHJpbmc+LFxuICAgIGFyZz86IFN0YXR1c0NvZGUgfCBSZXNwb25zZUluaXQsXG4gICAgaGVhZGVycz86IEhlYWRlclJlY29yZFxuICApOiBSZXNwb25zZSB8IFByb21pc2U8UmVzcG9uc2U+ID0+IHtcbiAgICB0aGlzLiNwcmVwYXJlZEhlYWRlcnMgPz89IHt9XG4gICAgdGhpcy4jcHJlcGFyZWRIZWFkZXJzWydjb250ZW50LXR5cGUnXSA9ICd0ZXh0L2h0bWw7IGNoYXJzZXQ9VVRGLTgnXG5cbiAgICBpZiAodHlwZW9mIGh0bWwgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoIShodG1sIGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgaHRtbCA9IChodG1sIGFzIHN0cmluZykudG9TdHJpbmcoKSAvLyBIdG1sRXNjYXBlZFN0cmluZyBvYmplY3QgdG8gc3RyaW5nXG4gICAgICB9XG4gICAgICBpZiAoKGh0bWwgYXMgc3RyaW5nIHwgUHJvbWlzZTxzdHJpbmc+KSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIChodG1sIGFzIHVua25vd24gYXMgUHJvbWlzZTxzdHJpbmc+KVxuICAgICAgICAgIC50aGVuKChodG1sKSA9PiByZXNvbHZlQ2FsbGJhY2soaHRtbCwgSHRtbEVzY2FwZWRDYWxsYmFja1BoYXNlLlN0cmluZ2lmeSwgZmFsc2UsIHt9KSlcbiAgICAgICAgICAudGhlbigoaHRtbCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInXG4gICAgICAgICAgICAgID8gdGhpcy5uZXdSZXNwb25zZShodG1sLCBhcmcsIGhlYWRlcnMpXG4gICAgICAgICAgICAgIDogdGhpcy5uZXdSZXNwb25zZShodG1sLCBhcmcpXG4gICAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcidcbiAgICAgID8gdGhpcy5uZXdSZXNwb25zZShodG1sIGFzIHN0cmluZywgYXJnLCBoZWFkZXJzKVxuICAgICAgOiB0aGlzLm5ld1Jlc3BvbnNlKGh0bWwgYXMgc3RyaW5nLCBhcmcpXG4gIH1cblxuICAvKipcbiAgICogYC5yZWRpcmVjdCgpYCBjYW4gUmVkaXJlY3QsIGRlZmF1bHQgc3RhdHVzIGNvZGUgaXMgMzAyLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0c1xuICAgKiBhcHAuZ2V0KCcvcmVkaXJlY3QnLCAoYykgPT4ge1xuICAgKiAgIHJldHVybiBjLnJlZGlyZWN0KCcvJylcbiAgICogfSlcbiAgICogYXBwLmdldCgnL3JlZGlyZWN0LXBlcm1hbmVudGx5JywgKGMpID0+IHtcbiAgICogICByZXR1cm4gYy5yZWRpcmVjdCgnLycsIDMwMSlcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvY29udGV4dCNyZWRpcmVjdFxuICAgKi9cbiAgcmVkaXJlY3QgPSAobG9jYXRpb246IHN0cmluZywgc3RhdHVzOiBSZWRpcmVjdFN0YXR1c0NvZGUgPSAzMDIpOiBSZXNwb25zZSA9PiB7XG4gICAgdGhpcy4jaGVhZGVycyA/Pz0gbmV3IEhlYWRlcnMoKVxuICAgIHRoaXMuI2hlYWRlcnMuc2V0KCdMb2NhdGlvbicsIGxvY2F0aW9uKVxuICAgIHJldHVybiB0aGlzLm5ld1Jlc3BvbnNlKG51bGwsIHN0YXR1cylcbiAgfVxuXG4gIC8qKlxuICAgKiBgLm5vdEZvdW5kKClgIGNhbiByZXR1cm4gdGhlIE5vdCBGb3VuZCBSZXNwb25zZS5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHNcbiAgICogYXBwLmdldCgnL25vdGZvdW5kJywgKGMpID0+IHtcbiAgICogICByZXR1cm4gYy5ub3RGb3VuZCgpXG4gICAqIH0pXG4gICAqIGBgYFxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL2NvbnRleHQjbm90Zm91bmRcbiAgICovXG4gIG5vdEZvdW5kID0gKCk6IFJlc3BvbnNlIHwgUHJvbWlzZTxSZXNwb25zZT4gPT4ge1xuICAgIHJldHVybiB0aGlzLm5vdEZvdW5k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
// denoCacheMetadata=16080058712898339341,888948969239399115