import { compose } from './compose.ts';
import { Context } from './context.ts';
import { HTTPException } from './http-exception.ts';
import { HonoRequest } from './request.ts';
import { METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE, METHODS } from './router.ts';
import { getPath, getPathNoStrict, getQueryStrings, mergePath } from './utils/url.ts';
export const COMPOSED_HANDLER = Symbol('composedHandler');
function defineDynamicClass() {
  return class {
  };
}
const notFoundHandler = (c)=>{
  return c.text('404 Not Found', 404);
};
const errorHandler = (err, c)=>{
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  return c.text('Internal Server Error', 500);
};
class Hono extends defineDynamicClass() {
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */ router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = '/';
  #path = '/';
  routes = [];
  constructor(options = {}){
    super();
    // Implementation of app.get(...handlers[]) or app.get(path, ...handlers[])
    const allMethods = [
      ...METHODS,
      METHOD_NAME_ALL_LOWERCASE
    ];
    allMethods.map((method)=>{
      this[method] = (args1, ...args)=>{
        if (typeof args1 === 'string') {
          this.#path = args1;
        } else {
          this.addRoute(method, this.#path, args1);
        }
        args.map((handler)=>{
          if (typeof handler !== 'string') {
            this.addRoute(method, this.#path, handler);
          }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this;
      };
    });
    // Implementation of app.on(method, path, ...handlers[])
    this.on = (method, path, ...handlers)=>{
      if (!method) {
        return this;
      }
      for (const p of [
        path
      ].flat()){
        this.#path = p;
        for (const m of [
          method
        ].flat()){
          handlers.map((handler)=>{
            this.addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this;
    };
    // Implementation of app.use(...handlers[]) or app.use(path, ...handlers[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.use = (arg1, ...handlers)=>{
      if (typeof arg1 === 'string') {
        this.#path = arg1;
      } else {
        this.#path = '*';
        handlers.unshift(arg1);
      }
      handlers.map((handler)=>{
        this.addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this;
    };
    const strict = options.strict ?? true;
    delete options.strict;
    Object.assign(this, options);
    this.getPath = strict ? options.getPath ?? getPath : getPathNoStrict;
  }
  clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.routes = this.routes;
    return clone;
  }
  notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app) {
    const subApp = this.basePath(path);
    if (!app) {
      return subApp;
    }
    app.routes.map((r)=>{
      let handler;
      if (app.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next)=>(await compose([], app.errorHandler)(c, ()=>r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   * @see https://hono.dev/api/routing#base-path
   */ basePath(path) {
    const subApp = this.clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */ onError = (handler)=>{
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   * @see https://hono.dev/api/hono#not-found
   */ notFound = (handler)=>{
    this.notFoundHandler = handler;
    return this;
  };
  mount(path, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applicationHandler, optionHandler) {
    const mergedPath = mergePath(this._basePath, path);
    const pathPrefixLength = mergedPath === '/' ? 0 : mergedPath.length;
    const handler = async (c, next)=>{
      let executionContext = undefined;
      try {
        executionContext = c.executionCtx;
      } catch  {} // Do nothing
      const options = optionHandler ? optionHandler(c) : [
        c.env,
        executionContext
      ];
      const optionsArray = Array.isArray(options) ? options : [
        options
      ];
      const queryStrings = getQueryStrings(c.req.url);
      const res = await applicationHandler(new Request(new URL((c.req.path.slice(pathPrefixLength) || '/') + queryStrings, c.req.url), c.req.raw), ...optionsArray);
      if (res) {
        return res;
      }
      await next();
    };
    this.addRoute(METHOD_NAME_ALL, mergePath(path, '*'), handler);
    return this;
  }
  addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      path: path,
      method: method,
      handler: handler
    };
    this.router.add(method, path, [
      handler,
      r
    ]);
    this.routes.push(r);
  }
  matchRoute(method, path) {
    return this.router.match(method, path);
  }
  handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  dispatch(request, executionCtx, env, method) {
    // Handle HEAD method
    if (method === 'HEAD') {
      return (async ()=>new Response(null, await this.dispatch(request, executionCtx, env, 'GET')))();
    }
    const path = this.getPath(request, {
      env
    });
    const matchResult = this.matchRoute(method, path);
    const c = new Context(new HonoRequest(request, path, matchResult), {
      env,
      executionCtx,
      notFoundHandler: this.notFoundHandler
    });
    // Do not `compose` if it has only one handler
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async ()=>{
          c.res = await this.notFoundHandler(c);
        });
      } catch (err) {
        return this.handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved)=>resolved || (c.finalized ? c.res : this.notFoundHandler(c))).catch((err)=>this.handleError(err, c)) : res;
    }
    const composed = compose(matchResult[0], this.errorHandler, this.notFoundHandler);
    return (async ()=>{
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error('Context is not finalized. You may forget returning Response object or `await next()`');
        }
        return context.res;
      } catch (err) {
        return this.handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   * @see https://hono.dev/api/hono#fetch
   */ fetch = (request, Env, executionCtx)=>{
    return this.dispatch(request, executionCtx, Env, request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/api/hono#request
   */ request = (input, requestInit, Env, executionCtx)=>{
    if (input instanceof Request) {
      if (requestInit !== undefined) {
        input = new Request(input, requestInit);
      }
      return this.fetch(input, Env, executionCtx);
    }
    input = input.toString();
    const path = /^https?:\/\//.test(input) ? input : `http://localhost${mergePath('/', input)}`;
    const req = new Request(path, requestInit);
    return this.fetch(req, Env, executionCtx);
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @see https://hono.dev/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */ fire = ()=>{
    // @ts-expect-error `event` is not the type expected by addEventListener
    addEventListener('fetch', (event)=>{
      event.respondWith(this.dispatch(event.request, event, undefined, event.request.method));
    });
  };
}
export { Hono as HonoBase };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9ob25vL2Rlbm9fZGlzdC9ob25vLWJhc2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY29tcG9zZSB9IGZyb20gJy4vY29tcG9zZS50cydcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQudHMnXG5pbXBvcnQgdHlwZSB7IEV4ZWN1dGlvbkNvbnRleHQgfSBmcm9tICcuL2NvbnRleHQudHMnXG5pbXBvcnQgeyBIVFRQRXhjZXB0aW9uIH0gZnJvbSAnLi9odHRwLWV4Y2VwdGlvbi50cydcbmltcG9ydCB7IEhvbm9SZXF1ZXN0IH0gZnJvbSAnLi9yZXF1ZXN0LnRzJ1xuaW1wb3J0IHR5cGUgeyBSb3V0ZXIgfSBmcm9tICcuL3JvdXRlci50cydcbmltcG9ydCB7IE1FVEhPRF9OQU1FX0FMTCwgTUVUSE9EX05BTUVfQUxMX0xPV0VSQ0FTRSwgTUVUSE9EUyB9IGZyb20gJy4vcm91dGVyLnRzJ1xuaW1wb3J0IHR5cGUge1xuICBFbnYsXG4gIEVycm9ySGFuZGxlcixcbiAgSCxcbiAgSGFuZGxlckludGVyZmFjZSxcbiAgTWlkZGxld2FyZUhhbmRsZXIsXG4gIE1pZGRsZXdhcmVIYW5kbGVySW50ZXJmYWNlLFxuICBOZXh0LFxuICBOb3RGb3VuZEhhbmRsZXIsXG4gIE9uSGFuZGxlckludGVyZmFjZSxcbiAgTWVyZ2VQYXRoLFxuICBNZXJnZVNjaGVtYVBhdGgsXG4gIEZldGNoRXZlbnRMaWtlLFxuICBTY2hlbWEsXG4gIFJvdXRlclJvdXRlLFxufSBmcm9tICcuL3R5cGVzLnRzJ1xuaW1wb3J0IHsgZ2V0UGF0aCwgZ2V0UGF0aE5vU3RyaWN0LCBnZXRRdWVyeVN0cmluZ3MsIG1lcmdlUGF0aCB9IGZyb20gJy4vdXRpbHMvdXJsLnRzJ1xuXG5leHBvcnQgY29uc3QgQ09NUE9TRURfSEFORExFUiA9IFN5bWJvbCgnY29tcG9zZWRIYW5kbGVyJylcblxudHlwZSBNZXRob2RzID0gKHR5cGVvZiBNRVRIT0RTKVtudW1iZXJdIHwgdHlwZW9mIE1FVEhPRF9OQU1FX0FMTF9MT1dFUkNBU0VcblxuZnVuY3Rpb24gZGVmaW5lRHluYW1pY0NsYXNzKCk6IHtcbiAgbmV3IDxFIGV4dGVuZHMgRW52ID0gRW52LCBTIGV4dGVuZHMgU2NoZW1hID0ge30sIEJhc2VQYXRoIGV4dGVuZHMgc3RyaW5nID0gJy8nPigpOiB7XG4gICAgW00gaW4gTWV0aG9kc106IEhhbmRsZXJJbnRlcmZhY2U8RSwgTSwgUywgQmFzZVBhdGg+XG4gIH0gJiB7XG4gICAgb246IE9uSGFuZGxlckludGVyZmFjZTxFLCBTLCBCYXNlUGF0aD5cbiAgfSAmIHtcbiAgICB1c2U6IE1pZGRsZXdhcmVIYW5kbGVySW50ZXJmYWNlPEUsIFMsIEJhc2VQYXRoPlxuICB9XG59IHtcbiAgcmV0dXJuIGNsYXNzIHt9IGFzIG5ldmVyXG59XG5cbmNvbnN0IG5vdEZvdW5kSGFuZGxlciA9IChjOiBDb250ZXh0KSA9PiB7XG4gIHJldHVybiBjLnRleHQoJzQwNCBOb3QgRm91bmQnLCA0MDQpXG59XG5cbmNvbnN0IGVycm9ySGFuZGxlciA9IChlcnI6IEVycm9yLCBjOiBDb250ZXh0KSA9PiB7XG4gIGlmIChlcnIgaW5zdGFuY2VvZiBIVFRQRXhjZXB0aW9uKSB7XG4gICAgcmV0dXJuIGVyci5nZXRSZXNwb25zZSgpXG4gIH1cbiAgY29uc29sZS5lcnJvcihlcnIpXG4gIHJldHVybiBjLnRleHQoJ0ludGVybmFsIFNlcnZlciBFcnJvcicsIDUwMClcbn1cblxudHlwZSBHZXRQYXRoPEUgZXh0ZW5kcyBFbnY+ID0gKHJlcXVlc3Q6IFJlcXVlc3QsIG9wdGlvbnM/OiB7IGVudj86IEVbJ0JpbmRpbmdzJ10gfSkgPT4gc3RyaW5nXG5cbmV4cG9ydCB0eXBlIEhvbm9PcHRpb25zPEUgZXh0ZW5kcyBFbnY+ID0ge1xuICAvKipcbiAgICogYHN0cmljdGAgb3B0aW9uIHNwZWNpZmllcyB3aGV0aGVyIHRvIGRpc3Rpbmd1aXNoIHdoZXRoZXIgdGhlIGxhc3QgcGF0aCBpcyBhIGRpcmVjdG9yeSBvciBub3QuXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9ob25vI3N0cmljdC1tb2RlXG4gICAqL1xuICBzdHJpY3Q/OiBib29sZWFuXG4gIC8qKlxuICAgKiBgcm91dGVyYCBvcHRpb24gc3BlY2lmaWNlcyB3aGljaCByb3V0ZXIgdG8gdXNlLlxuICAgKiBgYGB0c1xuICAgKiBjb25zdCBhcHAgPSBuZXcgSG9ubyh7IHJvdXRlcjogbmV3IFJlZ0V4cFJvdXRlcigpIH0pXG4gICAqIGBgYFxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL2hvbm8jcm91dGVyLW9wdGlvblxuICAgKi9cbiAgcm91dGVyPzogUm91dGVyPFtILCBSb3V0ZXJSb3V0ZV0+XG4gIC8qKlxuICAgKiBgZ2V0UGF0aGAgY2FuIGhhbmRsZSB0aGUgaG9zdCBoZWFkZXIgdmFsdWUuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHRzXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBIb25vKHtcbiAgICogIGdldFBhdGg6IChyZXEpID0+XG4gICAqICAgJy8nICsgcmVxLmhlYWRlcnMuZ2V0KCdob3N0JykgKyByZXEudXJsLnJlcGxhY2UoL15odHRwcz86XFwvXFwvW14vXSsoXFwvW14/XSopLywgJyQxJyksXG4gICAqIH0pXG4gICAqXG4gICAqIGFwcC5nZXQoJy93d3cxLmV4YW1wbGUuY29tL2hlbGxvJywgKCkgPT4gYy50ZXh0KCdoZWxsbyB3d3cxJykpXG4gICAqXG4gICAqIC8vIEEgZm9sbG93aW5nIHJlcXVlc3Qgd2lsbCBtYXRjaCB0aGUgcm91dGU6XG4gICAqIC8vIG5ldyBSZXF1ZXN0KCdodHRwOi8vd3d3MS5leGFtcGxlLmNvbS9oZWxsbycsIHtcbiAgICogLy8gIGhlYWRlcnM6IHsgaG9zdDogJ3d3dzEuZXhhbXBsZS5jb20nIH0sXG4gICAqIC8vIH0pXG4gICAqIGBgYFxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL3JvdXRpbmcjcm91dGluZy13aXRoLWhvc3QtaGVhZGVyLXZhbHVlXG4gICAqL1xuICBnZXRQYXRoPzogR2V0UGF0aDxFPlxufVxuXG5jbGFzcyBIb25vPFxuICBFIGV4dGVuZHMgRW52ID0gRW52LFxuICBTIGV4dGVuZHMgU2NoZW1hID0ge30sXG4gIEJhc2VQYXRoIGV4dGVuZHMgc3RyaW5nID0gJy8nXG4+IGV4dGVuZHMgZGVmaW5lRHluYW1pY0NsYXNzKCk8RSwgUywgQmFzZVBhdGg+IHtcbiAgLypcbiAgICBUaGlzIGNsYXNzIGlzIGxpa2UgYW4gYWJzdHJhY3QgY2xhc3MgYW5kIGRvZXMgbm90IGhhdmUgYSByb3V0ZXIuXG4gICAgVG8gdXNlIGl0LCBpbmhlcml0IHRoZSBjbGFzcyBhbmQgaW1wbGVtZW50IHJvdXRlciBpbiB0aGUgY29uc3RydWN0b3IuXG4gICovXG4gIHJvdXRlciE6IFJvdXRlcjxbSCwgUm91dGVyUm91dGVdPlxuICByZWFkb25seSBnZXRQYXRoOiBHZXRQYXRoPEU+XG4gIC8vIENhbm5vdCB1c2UgYCNgIGJlY2F1c2UgaXQgcmVxdWlyZXMgdmlzaWJpbGl0eSBhdCBKYXZhU2NyaXB0IHJ1bnRpbWUuXG4gIHByaXZhdGUgX2Jhc2VQYXRoOiBzdHJpbmcgPSAnLydcbiAgI3BhdGg6IHN0cmluZyA9ICcvJ1xuXG4gIHJvdXRlczogUm91dGVyUm91dGVbXSA9IFtdXG5cbiAgY29uc3RydWN0b3Iob3B0aW9uczogSG9ub09wdGlvbnM8RT4gPSB7fSkge1xuICAgIHN1cGVyKClcblxuICAgIC8vIEltcGxlbWVudGF0aW9uIG9mIGFwcC5nZXQoLi4uaGFuZGxlcnNbXSkgb3IgYXBwLmdldChwYXRoLCAuLi5oYW5kbGVyc1tdKVxuICAgIGNvbnN0IGFsbE1ldGhvZHMgPSBbLi4uTUVUSE9EUywgTUVUSE9EX05BTUVfQUxMX0xPV0VSQ0FTRV1cbiAgICBhbGxNZXRob2RzLm1hcCgobWV0aG9kKSA9PiB7XG4gICAgICB0aGlzW21ldGhvZF0gPSAoYXJnczE6IHN0cmluZyB8IEgsIC4uLmFyZ3M6IEhbXSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGFyZ3MxID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuI3BhdGggPSBhcmdzMVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuYWRkUm91dGUobWV0aG9kLCB0aGlzLiNwYXRoLCBhcmdzMSlcbiAgICAgICAgfVxuICAgICAgICBhcmdzLm1hcCgoaGFuZGxlcikgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGFuZGxlciAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkUm91dGUobWV0aG9kLCB0aGlzLiNwYXRoLCBoYW5kbGVyKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgcmV0dXJuIHRoaXMgYXMgYW55XG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIEltcGxlbWVudGF0aW9uIG9mIGFwcC5vbihtZXRob2QsIHBhdGgsIC4uLmhhbmRsZXJzW10pXG4gICAgdGhpcy5vbiA9IChtZXRob2Q6IHN0cmluZyB8IHN0cmluZ1tdLCBwYXRoOiBzdHJpbmcgfCBzdHJpbmdbXSwgLi4uaGFuZGxlcnM6IEhbXSkgPT4ge1xuICAgICAgaWYgKCFtZXRob2QpIHtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcCBvZiBbcGF0aF0uZmxhdCgpKSB7XG4gICAgICAgIHRoaXMuI3BhdGggPSBwXG4gICAgICAgIGZvciAoY29uc3QgbSBvZiBbbWV0aG9kXS5mbGF0KCkpIHtcbiAgICAgICAgICBoYW5kbGVycy5tYXAoKGhhbmRsZXIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYWRkUm91dGUobS50b1VwcGVyQ2FzZSgpLCB0aGlzLiNwYXRoLCBoYW5kbGVyKVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICByZXR1cm4gdGhpcyBhcyBhbnlcbiAgICB9XG5cbiAgICAvLyBJbXBsZW1lbnRhdGlvbiBvZiBhcHAudXNlKC4uLmhhbmRsZXJzW10pIG9yIGFwcC51c2UocGF0aCwgLi4uaGFuZGxlcnNbXSlcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIHRoaXMudXNlID0gKGFyZzE6IHN0cmluZyB8IE1pZGRsZXdhcmVIYW5kbGVyPGFueT4sIC4uLmhhbmRsZXJzOiBNaWRkbGV3YXJlSGFuZGxlcjxhbnk+W10pID0+IHtcbiAgICAgIGlmICh0eXBlb2YgYXJnMSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy4jcGF0aCA9IGFyZzFcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuI3BhdGggPSAnKidcbiAgICAgICAgaGFuZGxlcnMudW5zaGlmdChhcmcxKVxuICAgICAgfVxuICAgICAgaGFuZGxlcnMubWFwKChoYW5kbGVyKSA9PiB7XG4gICAgICAgIHRoaXMuYWRkUm91dGUoTUVUSE9EX05BTUVfQUxMLCB0aGlzLiNwYXRoLCBoYW5kbGVyKVxuICAgICAgfSlcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICByZXR1cm4gdGhpcyBhcyBhbnlcbiAgICB9XG5cbiAgICBjb25zdCBzdHJpY3QgPSBvcHRpb25zLnN0cmljdCA/PyB0cnVlXG4gICAgZGVsZXRlIG9wdGlvbnMuc3RyaWN0XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBvcHRpb25zKVxuICAgIHRoaXMuZ2V0UGF0aCA9IHN0cmljdCA/IG9wdGlvbnMuZ2V0UGF0aCA/PyBnZXRQYXRoIDogZ2V0UGF0aE5vU3RyaWN0XG4gIH1cblxuICBwcml2YXRlIGNsb25lKCk6IEhvbm88RSwgUywgQmFzZVBhdGg+IHtcbiAgICBjb25zdCBjbG9uZSA9IG5ldyBIb25vPEUsIFMsIEJhc2VQYXRoPih7XG4gICAgICByb3V0ZXI6IHRoaXMucm91dGVyLFxuICAgICAgZ2V0UGF0aDogdGhpcy5nZXRQYXRoLFxuICAgIH0pXG4gICAgY2xvbmUucm91dGVzID0gdGhpcy5yb3V0ZXNcbiAgICByZXR1cm4gY2xvbmVcbiAgfVxuXG4gIHByaXZhdGUgbm90Rm91bmRIYW5kbGVyOiBOb3RGb3VuZEhhbmRsZXIgPSBub3RGb3VuZEhhbmRsZXJcbiAgcHJpdmF0ZSBlcnJvckhhbmRsZXI6IEVycm9ySGFuZGxlciA9IGVycm9ySGFuZGxlclxuXG4gIHJvdXRlPFxuICAgIFN1YlBhdGggZXh0ZW5kcyBzdHJpbmcsXG4gICAgU3ViRW52IGV4dGVuZHMgRW52LFxuICAgIFN1YlNjaGVtYSBleHRlbmRzIFNjaGVtYSxcbiAgICBTdWJCYXNlUGF0aCBleHRlbmRzIHN0cmluZ1xuICA+KFxuICAgIHBhdGg6IFN1YlBhdGgsXG4gICAgYXBwPzogSG9ubzxTdWJFbnYsIFN1YlNjaGVtYSwgU3ViQmFzZVBhdGg+XG4gICk6IEhvbm88RSwgTWVyZ2VTY2hlbWFQYXRoPFN1YlNjaGVtYSwgTWVyZ2VQYXRoPEJhc2VQYXRoLCBTdWJQYXRoPj4gJiBTLCBCYXNlUGF0aD4ge1xuICAgIGNvbnN0IHN1YkFwcCA9IHRoaXMuYmFzZVBhdGgocGF0aClcblxuICAgIGlmICghYXBwKSB7XG4gICAgICByZXR1cm4gc3ViQXBwXG4gICAgfVxuXG4gICAgYXBwLnJvdXRlcy5tYXAoKHIpID0+IHtcbiAgICAgIGxldCBoYW5kbGVyXG4gICAgICBpZiAoYXBwLmVycm9ySGFuZGxlciA9PT0gZXJyb3JIYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIgPSByLmhhbmRsZXJcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhhbmRsZXIgPSBhc3luYyAoYzogQ29udGV4dCwgbmV4dDogTmV4dCkgPT5cbiAgICAgICAgICAoYXdhaXQgY29tcG9zZTxDb250ZXh0PihbXSwgYXBwLmVycm9ySGFuZGxlcikoYywgKCkgPT4gci5oYW5kbGVyKGMsIG5leHQpKSkucmVzXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgIDsoaGFuZGxlciBhcyBhbnkpW0NPTVBPU0VEX0hBTkRMRVJdID0gci5oYW5kbGVyXG4gICAgICB9XG5cbiAgICAgIHN1YkFwcC5hZGRSb3V0ZShyLm1ldGhvZCwgci5wYXRoLCBoYW5kbGVyKVxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBgLmJhc2VQYXRoKClgIGFsbG93cyBiYXNlIHBhdGhzIHRvIGJlIHNwZWNpZmllZC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHNcbiAgICogY29uc3QgYXBpID0gbmV3IEhvbm8oKS5iYXNlUGF0aCgnL2FwaScpXG4gICAqIGBgYFxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL3JvdXRpbmcjYmFzZS1wYXRoXG4gICAqL1xuICBiYXNlUGF0aDxTdWJQYXRoIGV4dGVuZHMgc3RyaW5nPihwYXRoOiBTdWJQYXRoKTogSG9ubzxFLCBTLCBNZXJnZVBhdGg8QmFzZVBhdGgsIFN1YlBhdGg+PiB7XG4gICAgY29uc3Qgc3ViQXBwID0gdGhpcy5jbG9uZSgpXG4gICAgc3ViQXBwLl9iYXNlUGF0aCA9IG1lcmdlUGF0aCh0aGlzLl9iYXNlUGF0aCwgcGF0aClcbiAgICByZXR1cm4gc3ViQXBwXG4gIH1cblxuICAvKipcbiAgICogYC5vbkVycm9yKClgIGhhbmRsZXMgYW4gZXJyb3IgYW5kIHJldHVybnMgYSBjdXN0b21pemVkIFJlc3BvbnNlLlxuICAgKiBgYGB0c1xuICAgKiBhcHAub25FcnJvcigoZXJyLCBjKSA9PiB7XG4gICAqICAgY29uc29sZS5lcnJvcihgJHtlcnJ9YClcbiAgICogICByZXR1cm4gYy50ZXh0KCdDdXN0b20gRXJyb3IgTWVzc2FnZScsIDUwMClcbiAgICogfSlcbiAgICogYGBgXG4gICAqL1xuICBvbkVycm9yID0gKGhhbmRsZXI6IEVycm9ySGFuZGxlcjxFPikgPT4ge1xuICAgIHRoaXMuZXJyb3JIYW5kbGVyID0gaGFuZGxlclxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogYC5ub3RGb3VuZCgpYCBhbGxvd3MgeW91IHRvIGN1c3RvbWl6ZSBhIE5vdCBGb3VuZCBSZXNwb25zZS5cbiAgICogYGBgdHNcbiAgICogYXBwLm5vdEZvdW5kKChjKSA9PiB7XG4gICAqICAgcmV0dXJuIGMudGV4dCgnQ3VzdG9tIDQwNCBNZXNzYWdlJywgNDA0KVxuICAgKiB9KVxuICAgKiBgYGBcbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9ob25vI25vdC1mb3VuZFxuICAgKi9cbiAgbm90Rm91bmQgPSAoaGFuZGxlcjogTm90Rm91bmRIYW5kbGVyPEU+KSA9PiB7XG4gICAgdGhpcy5ub3RGb3VuZEhhbmRsZXIgPSBoYW5kbGVyXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIG1vdW50KFxuICAgIHBhdGg6IHN0cmluZyxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGFwcGxpY2F0aW9uSGFuZGxlcjogKHJlcXVlc3Q6IFJlcXVlc3QsIC4uLmFyZ3M6IGFueSkgPT4gUmVzcG9uc2UgfCBQcm9taXNlPFJlc3BvbnNlPixcbiAgICBvcHRpb25IYW5kbGVyPzogKGM6IENvbnRleHQpID0+IHVua25vd25cbiAgKTogSG9ubzxFLCBTLCBCYXNlUGF0aD4ge1xuICAgIGNvbnN0IG1lcmdlZFBhdGggPSBtZXJnZVBhdGgodGhpcy5fYmFzZVBhdGgsIHBhdGgpXG4gICAgY29uc3QgcGF0aFByZWZpeExlbmd0aCA9IG1lcmdlZFBhdGggPT09ICcvJyA/IDAgOiBtZXJnZWRQYXRoLmxlbmd0aFxuXG4gICAgY29uc3QgaGFuZGxlcjogTWlkZGxld2FyZUhhbmRsZXIgPSBhc3luYyAoYywgbmV4dCkgPT4ge1xuICAgICAgbGV0IGV4ZWN1dGlvbkNvbnRleHQ6IEV4ZWN1dGlvbkNvbnRleHQgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcbiAgICAgIHRyeSB7XG4gICAgICAgIGV4ZWN1dGlvbkNvbnRleHQgPSBjLmV4ZWN1dGlvbkN0eFxuICAgICAgfSBjYXRjaCB7fSAvLyBEbyBub3RoaW5nXG4gICAgICBjb25zdCBvcHRpb25zID0gb3B0aW9uSGFuZGxlciA/IG9wdGlvbkhhbmRsZXIoYykgOiBbYy5lbnYsIGV4ZWN1dGlvbkNvbnRleHRdXG4gICAgICBjb25zdCBvcHRpb25zQXJyYXkgPSBBcnJheS5pc0FycmF5KG9wdGlvbnMpID8gb3B0aW9ucyA6IFtvcHRpb25zXVxuXG4gICAgICBjb25zdCBxdWVyeVN0cmluZ3MgPSBnZXRRdWVyeVN0cmluZ3MoYy5yZXEudXJsKVxuICAgICAgY29uc3QgcmVzID0gYXdhaXQgYXBwbGljYXRpb25IYW5kbGVyKFxuICAgICAgICBuZXcgUmVxdWVzdChcbiAgICAgICAgICBuZXcgVVJMKChjLnJlcS5wYXRoLnNsaWNlKHBhdGhQcmVmaXhMZW5ndGgpIHx8ICcvJykgKyBxdWVyeVN0cmluZ3MsIGMucmVxLnVybCksXG4gICAgICAgICAgYy5yZXEucmF3XG4gICAgICAgICksXG4gICAgICAgIC4uLm9wdGlvbnNBcnJheVxuICAgICAgKVxuXG4gICAgICBpZiAocmVzKSB7XG4gICAgICAgIHJldHVybiByZXNcbiAgICAgIH1cblxuICAgICAgYXdhaXQgbmV4dCgpXG4gICAgfVxuICAgIHRoaXMuYWRkUm91dGUoTUVUSE9EX05BTUVfQUxMLCBtZXJnZVBhdGgocGF0aCwgJyonKSwgaGFuZGxlcilcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRSb3V0ZShtZXRob2Q6IHN0cmluZywgcGF0aDogc3RyaW5nLCBoYW5kbGVyOiBIKSB7XG4gICAgbWV0aG9kID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICBwYXRoID0gbWVyZ2VQYXRoKHRoaXMuX2Jhc2VQYXRoLCBwYXRoKVxuICAgIGNvbnN0IHI6IFJvdXRlclJvdXRlID0geyBwYXRoOiBwYXRoLCBtZXRob2Q6IG1ldGhvZCwgaGFuZGxlcjogaGFuZGxlciB9XG4gICAgdGhpcy5yb3V0ZXIuYWRkKG1ldGhvZCwgcGF0aCwgW2hhbmRsZXIsIHJdKVxuICAgIHRoaXMucm91dGVzLnB1c2gocilcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2hSb3V0ZShtZXRob2Q6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVyLm1hdGNoKG1ldGhvZCwgcGF0aClcbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlRXJyb3IoZXJyOiB1bmtub3duLCBjOiBDb250ZXh0PEU+KSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICByZXR1cm4gdGhpcy5lcnJvckhhbmRsZXIoZXJyLCBjKVxuICAgIH1cbiAgICB0aHJvdyBlcnJcbiAgfVxuXG4gIHByaXZhdGUgZGlzcGF0Y2goXG4gICAgcmVxdWVzdDogUmVxdWVzdCxcbiAgICBleGVjdXRpb25DdHg6IEV4ZWN1dGlvbkNvbnRleHQgfCBGZXRjaEV2ZW50TGlrZSB8IHVuZGVmaW5lZCxcbiAgICBlbnY6IEVbJ0JpbmRpbmdzJ10sXG4gICAgbWV0aG9kOiBzdHJpbmdcbiAgKTogUmVzcG9uc2UgfCBQcm9taXNlPFJlc3BvbnNlPiB7XG4gICAgLy8gSGFuZGxlIEhFQUQgbWV0aG9kXG4gICAgaWYgKG1ldGhvZCA9PT0gJ0hFQUQnKSB7XG4gICAgICByZXR1cm4gKGFzeW5jICgpID0+XG4gICAgICAgIG5ldyBSZXNwb25zZShudWxsLCBhd2FpdCB0aGlzLmRpc3BhdGNoKHJlcXVlc3QsIGV4ZWN1dGlvbkN0eCwgZW52LCAnR0VUJykpKSgpXG4gICAgfVxuXG4gICAgY29uc3QgcGF0aCA9IHRoaXMuZ2V0UGF0aChyZXF1ZXN0LCB7IGVudiB9KVxuICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gdGhpcy5tYXRjaFJvdXRlKG1ldGhvZCwgcGF0aClcblxuICAgIGNvbnN0IGMgPSBuZXcgQ29udGV4dChuZXcgSG9ub1JlcXVlc3QocmVxdWVzdCwgcGF0aCwgbWF0Y2hSZXN1bHQpLCB7XG4gICAgICBlbnYsXG4gICAgICBleGVjdXRpb25DdHgsXG4gICAgICBub3RGb3VuZEhhbmRsZXI6IHRoaXMubm90Rm91bmRIYW5kbGVyLFxuICAgIH0pXG5cbiAgICAvLyBEbyBub3QgYGNvbXBvc2VgIGlmIGl0IGhhcyBvbmx5IG9uZSBoYW5kbGVyXG4gICAgaWYgKG1hdGNoUmVzdWx0WzBdLmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGV0IHJlczogUmV0dXJuVHlwZTxIPlxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzID0gbWF0Y2hSZXN1bHRbMF1bMF1bMF1bMF0oYywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGMucmVzID0gYXdhaXQgdGhpcy5ub3RGb3VuZEhhbmRsZXIoYylcbiAgICAgICAgfSlcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVFcnJvcihlcnIsIGMpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXMgaW5zdGFuY2VvZiBQcm9taXNlXG4gICAgICAgID8gcmVzXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgKHJlc29sdmVkOiBSZXNwb25zZSB8IHVuZGVmaW5lZCkgPT5cbiAgICAgICAgICAgICAgICByZXNvbHZlZCB8fCAoYy5maW5hbGl6ZWQgPyBjLnJlcyA6IHRoaXMubm90Rm91bmRIYW5kbGVyKGMpKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgLmNhdGNoKChlcnI6IEVycm9yKSA9PiB0aGlzLmhhbmRsZUVycm9yKGVyciwgYykpXG4gICAgICAgIDogcmVzXG4gICAgfVxuXG4gICAgY29uc3QgY29tcG9zZWQgPSBjb21wb3NlPENvbnRleHQ+KG1hdGNoUmVzdWx0WzBdLCB0aGlzLmVycm9ySGFuZGxlciwgdGhpcy5ub3RGb3VuZEhhbmRsZXIpXG5cbiAgICByZXR1cm4gKGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBjb21wb3NlZChjKVxuICAgICAgICBpZiAoIWNvbnRleHQuZmluYWxpemVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ0NvbnRleHQgaXMgbm90IGZpbmFsaXplZC4gWW91IG1heSBmb3JnZXQgcmV0dXJuaW5nIFJlc3BvbnNlIG9iamVjdCBvciBgYXdhaXQgbmV4dCgpYCdcbiAgICAgICAgICApXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29udGV4dC5yZXNcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVFcnJvcihlcnIsIGMpXG4gICAgICB9XG4gICAgfSkoKVxuICB9XG5cbiAgLyoqXG4gICAqIGAuZmV0Y2goKWAgd2lsbCBiZSBlbnRyeSBwb2ludCBvZiB5b3VyIGFwcC5cbiAgICogQHNlZSBodHRwczovL2hvbm8uZGV2L2FwaS9ob25vI2ZldGNoXG4gICAqL1xuICBmZXRjaCA9IChyZXF1ZXN0OiBSZXF1ZXN0LCBFbnY/OiBFWydCaW5kaW5ncyddIHwge30sIGV4ZWN1dGlvbkN0eD86IEV4ZWN1dGlvbkNvbnRleHQpID0+IHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChyZXF1ZXN0LCBleGVjdXRpb25DdHgsIEVudiwgcmVxdWVzdC5tZXRob2QpXG4gIH1cblxuICAvKipcbiAgICogYC5yZXF1ZXN0KClgIGlzIGEgdXNlZnVsIG1ldGhvZCBmb3IgdGVzdGluZy5cbiAgICogWW91IGNhbiBwYXNzIGEgVVJMIG9yIHBhdGhuYW1lIHRvIHNlbmQgYSBHRVQgcmVxdWVzdC5cbiAgICogYXBwIHdpbGwgcmV0dXJuIGEgUmVzcG9uc2Ugb2JqZWN0LlxuICAgKiBgYGB0c1xuICAgKiB0ZXN0KCdHRVQgL2hlbGxvIGlzIG9rJywgYXN5bmMgKCkgPT4ge1xuICAgKiAgIGNvbnN0IHJlcyA9IGF3YWl0IGFwcC5yZXF1ZXN0KCcvaGVsbG8nKVxuICAgKiAgIGV4cGVjdChyZXMuc3RhdHVzKS50b0JlKDIwMClcbiAgICogfSlcbiAgICogYGBgXG4gICAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvaG9ubyNyZXF1ZXN0XG4gICAqL1xuICByZXF1ZXN0ID0gKFxuICAgIGlucHV0OiBSZXF1ZXN0SW5mbyB8IFVSTCxcbiAgICByZXF1ZXN0SW5pdD86IFJlcXVlc3RJbml0LFxuICAgIEVudj86IEVbJ0JpbmRpbmdzJ10gfCB7fSxcbiAgICBleGVjdXRpb25DdHg/OiBFeGVjdXRpb25Db250ZXh0XG4gICkgPT4ge1xuICAgIGlmIChpbnB1dCBpbnN0YW5jZW9mIFJlcXVlc3QpIHtcbiAgICAgIGlmIChyZXF1ZXN0SW5pdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlucHV0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIHJlcXVlc3RJbml0KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZmV0Y2goaW5wdXQsIEVudiwgZXhlY3V0aW9uQ3R4KVxuICAgIH1cbiAgICBpbnB1dCA9IGlucHV0LnRvU3RyaW5nKClcbiAgICBjb25zdCBwYXRoID0gL15odHRwcz86XFwvXFwvLy50ZXN0KGlucHV0KSA/IGlucHV0IDogYGh0dHA6Ly9sb2NhbGhvc3Qke21lcmdlUGF0aCgnLycsIGlucHV0KX1gXG4gICAgY29uc3QgcmVxID0gbmV3IFJlcXVlc3QocGF0aCwgcmVxdWVzdEluaXQpXG4gICAgcmV0dXJuIHRoaXMuZmV0Y2gocmVxLCBFbnYsIGV4ZWN1dGlvbkN0eClcbiAgfVxuXG4gIC8qKlxuICAgKiBgLmZpcmUoKWAgYXV0b21hdGljYWxseSBhZGRzIGEgZ2xvYmFsIGZldGNoIGV2ZW50IGxpc3RlbmVyLlxuICAgKiBUaGlzIGNhbiBiZSB1c2VmdWwgZm9yIGVudmlyb25tZW50cyB0aGF0IGFkaGVyZSB0byB0aGUgU2VydmljZSBXb3JrZXIgQVBJLCBzdWNoIGFzIG5vbi1FUyBtb2R1bGUgQ2xvdWRmbGFyZSBXb3JrZXJzLlxuICAgKiBAc2VlIGh0dHBzOi8vaG9uby5kZXYvYXBpL2hvbm8jZmlyZVxuICAgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9TZXJ2aWNlX1dvcmtlcl9BUElcbiAgICogQHNlZSBodHRwczovL2RldmVsb3BlcnMuY2xvdWRmbGFyZS5jb20vd29ya2Vycy9yZWZlcmVuY2UvbWlncmF0ZS10by1tb2R1bGUtd29ya2Vycy9cbiAgICovXG4gIGZpcmUgPSAoKSA9PiB7XG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvciBgZXZlbnRgIGlzIG5vdCB0aGUgdHlwZSBleHBlY3RlZCBieSBhZGRFdmVudExpc3RlbmVyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcignZmV0Y2gnLCAoZXZlbnQ6IEZldGNoRXZlbnRMaWtlKTogdm9pZCA9PiB7XG4gICAgICBldmVudC5yZXNwb25kV2l0aCh0aGlzLmRpc3BhdGNoKGV2ZW50LnJlcXVlc3QsIGV2ZW50LCB1bmRlZmluZWQsIGV2ZW50LnJlcXVlc3QubWV0aG9kKSlcbiAgICB9KVxuICB9XG59XG5cbmV4cG9ydCB7IEhvbm8gYXMgSG9ub0Jhc2UgfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsT0FBTyxRQUFRLGVBQWM7QUFDdEMsU0FBUyxPQUFPLFFBQVEsZUFBYztBQUV0QyxTQUFTLGFBQWEsUUFBUSxzQkFBcUI7QUFDbkQsU0FBUyxXQUFXLFFBQVEsZUFBYztBQUUxQyxTQUFTLGVBQWUsRUFBRSx5QkFBeUIsRUFBRSxPQUFPLFFBQVEsY0FBYTtBQWlCakYsU0FBUyxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxTQUFTLFFBQVEsaUJBQWdCO0FBRXJGLE9B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
// denoCacheMetadata=2060782536129248037,12840593218803595729