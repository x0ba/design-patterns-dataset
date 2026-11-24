import { Context } from './context.ts';
// Based on the code in the MIT licensed `koa-compose` package.
export const compose = (middleware, onError, onNotFound)=>{
  return (context, next)=>{
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        if (context instanceof Context) {
          context.req.routeIndex = i;
        }
      } else {
        handler = i === middleware.length && next || undefined;
      }
      if (!handler) {
        if (context instanceof Context && context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      } else {
        try {
          res = await handler(context, ()=>{
            return dispatch(i + 1);
          });
        } catch (err) {
          if (err instanceof Error && context instanceof Context && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9ob25vL2Rlbm9fZGlzdC9jb21wb3NlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQudHMnXG5pbXBvcnQgdHlwZSB7IFBhcmFtSW5kZXhNYXAsIFBhcmFtcyB9IGZyb20gJy4vcm91dGVyLnRzJ1xuaW1wb3J0IHR5cGUgeyBFbnYsIE5vdEZvdW5kSGFuZGxlciwgRXJyb3JIYW5kbGVyIH0gZnJvbSAnLi90eXBlcy50cydcblxuaW50ZXJmYWNlIENvbXBvc2VDb250ZXh0IHtcbiAgZmluYWxpemVkOiBib29sZWFuXG4gIHJlczogdW5rbm93blxufVxuXG4vLyBCYXNlZCBvbiB0aGUgY29kZSBpbiB0aGUgTUlUIGxpY2Vuc2VkIGBrb2EtY29tcG9zZWAgcGFja2FnZS5cbmV4cG9ydCBjb25zdCBjb21wb3NlID0gPEMgZXh0ZW5kcyBDb21wb3NlQ29udGV4dCwgRSBleHRlbmRzIEVudiA9IEVudj4oXG4gIG1pZGRsZXdhcmU6IFtbRnVuY3Rpb24sIHVua25vd25dLCBQYXJhbUluZGV4TWFwIHwgUGFyYW1zXVtdLFxuICBvbkVycm9yPzogRXJyb3JIYW5kbGVyPEU+LFxuICBvbk5vdEZvdW5kPzogTm90Rm91bmRIYW5kbGVyPEU+XG4pID0+IHtcbiAgcmV0dXJuIChjb250ZXh0OiBDLCBuZXh0PzogRnVuY3Rpb24pID0+IHtcbiAgICBsZXQgaW5kZXggPSAtMVxuICAgIHJldHVybiBkaXNwYXRjaCgwKVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gZGlzcGF0Y2goaTogbnVtYmVyKTogUHJvbWlzZTxDPiB7XG4gICAgICBpZiAoaSA8PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25leHQoKSBjYWxsZWQgbXVsdGlwbGUgdGltZXMnKVxuICAgICAgfVxuICAgICAgaW5kZXggPSBpXG5cbiAgICAgIGxldCByZXNcbiAgICAgIGxldCBpc0Vycm9yID0gZmFsc2VcbiAgICAgIGxldCBoYW5kbGVyXG5cbiAgICAgIGlmIChtaWRkbGV3YXJlW2ldKSB7XG4gICAgICAgIGhhbmRsZXIgPSBtaWRkbGV3YXJlW2ldWzBdWzBdXG4gICAgICAgIGlmIChjb250ZXh0IGluc3RhbmNlb2YgQ29udGV4dCkge1xuICAgICAgICAgIGNvbnRleHQucmVxLnJvdXRlSW5kZXggPSBpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhhbmRsZXIgPSAoaSA9PT0gbWlkZGxld2FyZS5sZW5ndGggJiYgbmV4dCkgfHwgdW5kZWZpbmVkXG4gICAgICB9XG5cbiAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICBpZiAoY29udGV4dCBpbnN0YW5jZW9mIENvbnRleHQgJiYgY29udGV4dC5maW5hbGl6ZWQgPT09IGZhbHNlICYmIG9uTm90Rm91bmQpIHtcbiAgICAgICAgICByZXMgPSBhd2FpdCBvbk5vdEZvdW5kKGNvbnRleHQpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzID0gYXdhaXQgaGFuZGxlcihjb250ZXh0LCAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZGlzcGF0Y2goaSArIDEpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yICYmIGNvbnRleHQgaW5zdGFuY2VvZiBDb250ZXh0ICYmIG9uRXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnRleHQuZXJyb3IgPSBlcnJcbiAgICAgICAgICAgIHJlcyA9IGF3YWl0IG9uRXJyb3IoZXJyLCBjb250ZXh0KVxuICAgICAgICAgICAgaXNFcnJvciA9IHRydWVcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXMgJiYgKGNvbnRleHQuZmluYWxpemVkID09PSBmYWxzZSB8fCBpc0Vycm9yKSkge1xuICAgICAgICBjb250ZXh0LnJlcyA9IHJlc1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvbnRleHRcbiAgICB9XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLE9BQU8sUUFBUSxlQUFjO0FBU3RDLCtEQUErRDtBQUMvRCxPQUFPLE1BQU0sVUFBVSxDQUNyQixZQUNBLFNBQ0E7RUFFQSxPQUFPLENBQUMsU0FBWTtJQUNsQixJQUFJLFFBQVEsQ0FBQztJQUNiLE9BQU8sU0FBUztJQUVoQixlQUFlLFNBQVMsQ0FBUztNQUMvQixJQUFJLEtBQUssT0FBTztRQUNkLE1BQU0sSUFBSSxNQUFNO01BQ2xCO01BQ0EsUUFBUTtNQUVSLElBQUk7TUFDSixJQUFJLFVBQVU7TUFDZCxJQUFJO01BRUosSUFBSSxVQUFVLENBQUMsRUFBRSxFQUFFO1FBQ2pCLFVBQVUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUM3QixJQUFJLG1CQUFtQixTQUFTO1VBQzlCLFFBQVEsR0FBRyxDQUFDLFVBQVUsR0FBRztRQUMzQjtNQUNGLE9BQU87UUFDTCxVQUFVLEFBQUMsTUFBTSxXQUFXLE1BQU0sSUFBSSxRQUFTO01BQ2pEO01BRUEsSUFBSSxDQUFDLFNBQVM7UUFDWixJQUFJLG1CQUFtQixXQUFXLFFBQVEsU0FBUyxLQUFLLFNBQVMsWUFBWTtVQUMzRSxNQUFNLE1BQU0sV0FBVztRQUN6QjtNQUNGLE9BQU87UUFDTCxJQUFJO1VBQ0YsTUFBTSxNQUFNLFFBQVEsU0FBUztZQUMzQixPQUFPLFNBQVMsSUFBSTtVQUN0QjtRQUNGLEVBQUUsT0FBTyxLQUFLO1VBQ1osSUFBSSxlQUFlLFNBQVMsbUJBQW1CLFdBQVcsU0FBUztZQUNqRSxRQUFRLEtBQUssR0FBRztZQUNoQixNQUFNLE1BQU0sUUFBUSxLQUFLO1lBQ3pCLFVBQVU7VUFDWixPQUFPO1lBQ0wsTUFBTTtVQUNSO1FBQ0Y7TUFDRjtNQUVBLElBQUksT0FBTyxDQUFDLFFBQVEsU0FBUyxLQUFLLFNBQVMsT0FBTyxHQUFHO1FBQ25ELFFBQVEsR0FBRyxHQUFHO01BQ2hCO01BQ0EsT0FBTztJQUNUO0VBQ0Y7QUFDRixFQUFDIn0=
// denoCacheMetadata=2332481743610596712,10011652976729082379