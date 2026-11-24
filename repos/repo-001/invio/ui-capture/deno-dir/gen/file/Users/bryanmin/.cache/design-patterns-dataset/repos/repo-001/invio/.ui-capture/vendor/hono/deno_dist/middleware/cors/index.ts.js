export const cors = (options)=>{
  const defaults = {
    origin: '*',
    allowMethods: [
      'GET',
      'HEAD',
      'PUT',
      'POST',
      'DELETE',
      'PATCH'
    ],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin)=>{
    if (typeof optsOrigin === 'string') {
      return ()=>optsOrigin;
    } else if (typeof optsOrigin === 'function') {
      return optsOrigin;
    } else {
      return (origin)=>optsOrigin.includes(origin) ? origin : optsOrigin[0];
    }
  })(opts.origin);
  return async function cors(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = findAllowOrigin(c.req.header('origin') || '');
    if (allowOrigin) {
      set('Access-Control-Allow-Origin', allowOrigin);
    }
    // Suppose the server sends a response with an Access-Control-Allow-Origin value with an explicit origin (rather than the "*" wildcard).
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    if (opts.origin !== '*') {
      set('Vary', 'Origin');
    }
    if (opts.credentials) {
      set('Access-Control-Allow-Credentials', 'true');
    }
    if (opts.exposeHeaders?.length) {
      set('Access-Control-Expose-Headers', opts.exposeHeaders.join(','));
    }
    if (c.req.method === 'OPTIONS') {
      if (opts.maxAge != null) {
        set('Access-Control-Max-Age', opts.maxAge.toString());
      }
      if (opts.allowMethods?.length) {
        set('Access-Control-Allow-Methods', opts.allowMethods.join(','));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header('Access-Control-Request-Headers');
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set('Access-Control-Allow-Headers', headers.join(','));
        c.res.headers.append('Vary', 'Access-Control-Request-Headers');
      }
      c.res.headers.delete('Content-Length');
      c.res.headers.delete('Content-Type');
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: c.res.statusText
      });
    }
    await next();
  };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9ob25vL2Rlbm9fZGlzdC9taWRkbGV3YXJlL2NvcnMvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBNaWRkbGV3YXJlSGFuZGxlciB9IGZyb20gJy4uLy4uL3R5cGVzLnRzJ1xuXG50eXBlIENPUlNPcHRpb25zID0ge1xuICBvcmlnaW46IHN0cmluZyB8IHN0cmluZ1tdIHwgKChvcmlnaW46IHN0cmluZykgPT4gc3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbClcbiAgYWxsb3dNZXRob2RzPzogc3RyaW5nW11cbiAgYWxsb3dIZWFkZXJzPzogc3RyaW5nW11cbiAgbWF4QWdlPzogbnVtYmVyXG4gIGNyZWRlbnRpYWxzPzogYm9vbGVhblxuICBleHBvc2VIZWFkZXJzPzogc3RyaW5nW11cbn1cblxuZXhwb3J0IGNvbnN0IGNvcnMgPSAob3B0aW9ucz86IENPUlNPcHRpb25zKTogTWlkZGxld2FyZUhhbmRsZXIgPT4ge1xuICBjb25zdCBkZWZhdWx0czogQ09SU09wdGlvbnMgPSB7XG4gICAgb3JpZ2luOiAnKicsXG4gICAgYWxsb3dNZXRob2RzOiBbJ0dFVCcsICdIRUFEJywgJ1BVVCcsICdQT1NUJywgJ0RFTEVURScsICdQQVRDSCddLFxuICAgIGFsbG93SGVhZGVyczogW10sXG4gICAgZXhwb3NlSGVhZGVyczogW10sXG4gIH1cbiAgY29uc3Qgb3B0cyA9IHtcbiAgICAuLi5kZWZhdWx0cyxcbiAgICAuLi5vcHRpb25zLFxuICB9XG5cbiAgY29uc3QgZmluZEFsbG93T3JpZ2luID0gKChvcHRzT3JpZ2luKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBvcHRzT3JpZ2luID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuICgpID0+IG9wdHNPcmlnaW5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRzT3JpZ2luID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gb3B0c09yaWdpblxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKG9yaWdpbjogc3RyaW5nKSA9PiAob3B0c09yaWdpbi5pbmNsdWRlcyhvcmlnaW4pID8gb3JpZ2luIDogb3B0c09yaWdpblswXSlcbiAgICB9XG4gIH0pKG9wdHMub3JpZ2luKVxuXG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiBjb3JzKGMsIG5leHQpIHtcbiAgICBmdW5jdGlvbiBzZXQoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpIHtcbiAgICAgIGMucmVzLmhlYWRlcnMuc2V0KGtleSwgdmFsdWUpXG4gICAgfVxuXG4gICAgY29uc3QgYWxsb3dPcmlnaW4gPSBmaW5kQWxsb3dPcmlnaW4oYy5yZXEuaGVhZGVyKCdvcmlnaW4nKSB8fCAnJylcbiAgICBpZiAoYWxsb3dPcmlnaW4pIHtcbiAgICAgIHNldCgnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgYWxsb3dPcmlnaW4pXG4gICAgfVxuXG4gICAgLy8gU3VwcG9zZSB0aGUgc2VydmVyIHNlbmRzIGEgcmVzcG9uc2Ugd2l0aCBhbiBBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4gdmFsdWUgd2l0aCBhbiBleHBsaWNpdCBvcmlnaW4gKHJhdGhlciB0aGFuIHRoZSBcIipcIiB3aWxkY2FyZCkuXG4gICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSFRUUC9IZWFkZXJzL0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblxuICAgIGlmIChvcHRzLm9yaWdpbiAhPT0gJyonKSB7XG4gICAgICBzZXQoJ1ZhcnknLCAnT3JpZ2luJylcbiAgICB9XG5cbiAgICBpZiAob3B0cy5jcmVkZW50aWFscykge1xuICAgICAgc2V0KCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscycsICd0cnVlJylcbiAgICB9XG5cbiAgICBpZiAob3B0cy5leHBvc2VIZWFkZXJzPy5sZW5ndGgpIHtcbiAgICAgIHNldCgnQWNjZXNzLUNvbnRyb2wtRXhwb3NlLUhlYWRlcnMnLCBvcHRzLmV4cG9zZUhlYWRlcnMuam9pbignLCcpKVxuICAgIH1cblxuICAgIGlmIChjLnJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgICAgaWYgKG9wdHMubWF4QWdlICE9IG51bGwpIHtcbiAgICAgICAgc2V0KCdBY2Nlc3MtQ29udHJvbC1NYXgtQWdlJywgb3B0cy5tYXhBZ2UudG9TdHJpbmcoKSlcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdHMuYWxsb3dNZXRob2RzPy5sZW5ndGgpIHtcbiAgICAgICAgc2V0KCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgb3B0cy5hbGxvd01ldGhvZHMuam9pbignLCcpKVxuICAgICAgfVxuXG4gICAgICBsZXQgaGVhZGVycyA9IG9wdHMuYWxsb3dIZWFkZXJzXG4gICAgICBpZiAoIWhlYWRlcnM/Lmxlbmd0aCkge1xuICAgICAgICBjb25zdCByZXF1ZXN0SGVhZGVycyA9IGMucmVxLmhlYWRlcignQWNjZXNzLUNvbnRyb2wtUmVxdWVzdC1IZWFkZXJzJylcbiAgICAgICAgaWYgKHJlcXVlc3RIZWFkZXJzKSB7XG4gICAgICAgICAgaGVhZGVycyA9IHJlcXVlc3RIZWFkZXJzLnNwbGl0KC9cXHMqLFxccyovKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoaGVhZGVycz8ubGVuZ3RoKSB7XG4gICAgICAgIHNldCgnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsIGhlYWRlcnMuam9pbignLCcpKVxuICAgICAgICBjLnJlcy5oZWFkZXJzLmFwcGVuZCgnVmFyeScsICdBY2Nlc3MtQ29udHJvbC1SZXF1ZXN0LUhlYWRlcnMnKVxuICAgICAgfVxuXG4gICAgICBjLnJlcy5oZWFkZXJzLmRlbGV0ZSgnQ29udGVudC1MZW5ndGgnKVxuICAgICAgYy5yZXMuaGVhZGVycy5kZWxldGUoJ0NvbnRlbnQtVHlwZScpXG5cbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge1xuICAgICAgICBoZWFkZXJzOiBjLnJlcy5oZWFkZXJzLFxuICAgICAgICBzdGF0dXM6IDIwNCxcbiAgICAgICAgc3RhdHVzVGV4dDogYy5yZXMuc3RhdHVzVGV4dCxcbiAgICAgIH0pXG4gICAgfVxuICAgIGF3YWl0IG5leHQoKVxuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBV0EsT0FBTyxNQUFNLE9BQU8sQ0FBQztFQUNuQixNQUFNLFdBQXdCO0lBQzVCLFFBQVE7SUFDUixjQUFjO01BQUM7TUFBTztNQUFRO01BQU87TUFBUTtNQUFVO0tBQVE7SUFDL0QsY0FBYyxFQUFFO0lBQ2hCLGVBQWUsRUFBRTtFQUNuQjtFQUNBLE1BQU0sT0FBTztJQUNYLEdBQUcsUUFBUTtJQUNYLEdBQUcsT0FBTztFQUNaO0VBRUEsTUFBTSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3hCLElBQUksT0FBTyxlQUFlLFVBQVU7TUFDbEMsT0FBTyxJQUFNO0lBQ2YsT0FBTyxJQUFJLE9BQU8sZUFBZSxZQUFZO01BQzNDLE9BQU87SUFDVCxPQUFPO01BQ0wsT0FBTyxDQUFDLFNBQW9CLFdBQVcsUUFBUSxDQUFDLFVBQVUsU0FBUyxVQUFVLENBQUMsRUFBRTtJQUNsRjtFQUNGLENBQUMsRUFBRSxLQUFLLE1BQU07RUFFZCxPQUFPLGVBQWUsS0FBSyxDQUFDLEVBQUUsSUFBSTtJQUNoQyxTQUFTLElBQUksR0FBVyxFQUFFLEtBQWE7TUFDckMsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLO0lBQ3pCO0lBRUEsTUFBTSxjQUFjLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYTtJQUM5RCxJQUFJLGFBQWE7TUFDZixJQUFJLCtCQUErQjtJQUNyQztJQUVBLHdJQUF3STtJQUN4SSx3RkFBd0Y7SUFDeEYsSUFBSSxLQUFLLE1BQU0sS0FBSyxLQUFLO01BQ3ZCLElBQUksUUFBUTtJQUNkO0lBRUEsSUFBSSxLQUFLLFdBQVcsRUFBRTtNQUNwQixJQUFJLG9DQUFvQztJQUMxQztJQUVBLElBQUksS0FBSyxhQUFhLEVBQUUsUUFBUTtNQUM5QixJQUFJLGlDQUFpQyxLQUFLLGFBQWEsQ0FBQyxJQUFJLENBQUM7SUFDL0Q7SUFFQSxJQUFJLEVBQUUsR0FBRyxDQUFDLE1BQU0sS0FBSyxXQUFXO01BQzlCLElBQUksS0FBSyxNQUFNLElBQUksTUFBTTtRQUN2QixJQUFJLDBCQUEwQixLQUFLLE1BQU0sQ0FBQyxRQUFRO01BQ3BEO01BRUEsSUFBSSxLQUFLLFlBQVksRUFBRSxRQUFRO1FBQzdCLElBQUksZ0NBQWdDLEtBQUssWUFBWSxDQUFDLElBQUksQ0FBQztNQUM3RDtNQUVBLElBQUksVUFBVSxLQUFLLFlBQVk7TUFDL0IsSUFBSSxDQUFDLFNBQVMsUUFBUTtRQUNwQixNQUFNLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDcEMsSUFBSSxnQkFBZ0I7VUFDbEIsVUFBVSxlQUFlLEtBQUssQ0FBQztRQUNqQztNQUNGO01BQ0EsSUFBSSxTQUFTLFFBQVE7UUFDbkIsSUFBSSxnQ0FBZ0MsUUFBUSxJQUFJLENBQUM7UUFDakQsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRO01BQy9CO01BRUEsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztNQUNyQixFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO01BRXJCLE9BQU8sSUFBSSxTQUFTLE1BQU07UUFDeEIsU0FBUyxFQUFFLEdBQUcsQ0FBQyxPQUFPO1FBQ3RCLFFBQVE7UUFDUixZQUFZLEVBQUUsR0FBRyxDQUFDLFVBQVU7TUFDOUI7SUFDRjtJQUNBLE1BQU07RUFDUjtBQUNGLEVBQUMifQ==
// denoCacheMetadata=16621344408565265604,3252224146021808022