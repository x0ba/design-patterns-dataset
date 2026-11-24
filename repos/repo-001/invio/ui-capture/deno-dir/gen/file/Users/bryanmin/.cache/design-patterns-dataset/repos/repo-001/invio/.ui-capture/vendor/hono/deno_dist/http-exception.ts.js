/**
 * `HTTPException` must be used when a fatal error such as authentication failure occurs.
 * @example
 * ```ts
 * import { HTTPException } from 'hono/http-exception'
 *
 * // ...
 *
 * app.post('/auth', async (c, next) => {
 *   // authentication
 *   if (authorized === false) {
 *     throw new HTTPException(401, { message: 'Custom error message' })
 *   }
 *   await next()
 * })
 * ```
 * @see https://hono.dev/api/exception
 */ export class HTTPException extends Error {
  res;
  status;
  constructor(status = 500, options){
    super(options?.message);
    this.res = options?.res;
    this.status = status;
  }
  getResponse() {
    if (this.res) {
      return this.res;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9ob25vL2Rlbm9fZGlzdC9odHRwLWV4Y2VwdGlvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFN0YXR1c0NvZGUgfSBmcm9tICcuL3V0aWxzL2h0dHAtc3RhdHVzLnRzJ1xuXG50eXBlIEhUVFBFeGNlcHRpb25PcHRpb25zID0ge1xuICByZXM/OiBSZXNwb25zZVxuICBtZXNzYWdlPzogc3RyaW5nXG59XG5cbi8qKlxuICogYEhUVFBFeGNlcHRpb25gIG11c3QgYmUgdXNlZCB3aGVuIGEgZmF0YWwgZXJyb3Igc3VjaCBhcyBhdXRoZW50aWNhdGlvbiBmYWlsdXJlIG9jY3Vycy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgSFRUUEV4Y2VwdGlvbiB9IGZyb20gJ2hvbm8vaHR0cC1leGNlcHRpb24nXG4gKlxuICogLy8gLi4uXG4gKlxuICogYXBwLnBvc3QoJy9hdXRoJywgYXN5bmMgKGMsIG5leHQpID0+IHtcbiAqICAgLy8gYXV0aGVudGljYXRpb25cbiAqICAgaWYgKGF1dGhvcml6ZWQgPT09IGZhbHNlKSB7XG4gKiAgICAgdGhyb3cgbmV3IEhUVFBFeGNlcHRpb24oNDAxLCB7IG1lc3NhZ2U6ICdDdXN0b20gZXJyb3IgbWVzc2FnZScgfSlcbiAqICAgfVxuICogICBhd2FpdCBuZXh0KClcbiAqIH0pXG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9ob25vLmRldi9hcGkvZXhjZXB0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBIVFRQRXhjZXB0aW9uIGV4dGVuZHMgRXJyb3Ige1xuICByZWFkb25seSByZXM/OiBSZXNwb25zZVxuICByZWFkb25seSBzdGF0dXM6IFN0YXR1c0NvZGVcbiAgY29uc3RydWN0b3Ioc3RhdHVzOiBTdGF0dXNDb2RlID0gNTAwLCBvcHRpb25zPzogSFRUUEV4Y2VwdGlvbk9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zPy5tZXNzYWdlKVxuICAgIHRoaXMucmVzID0gb3B0aW9ucz8ucmVzXG4gICAgdGhpcy5zdGF0dXMgPSBzdGF0dXNcbiAgfVxuICBnZXRSZXNwb25zZSgpOiBSZXNwb25zZSB7XG4gICAgaWYgKHRoaXMucmVzKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLm1lc3NhZ2UsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgfSlcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BOzs7Ozs7Ozs7Ozs7Ozs7OztDQWlCQyxHQUNELE9BQU8sTUFBTSxzQkFBc0I7RUFDeEIsSUFBYztFQUNkLE9BQWtCO0VBQzNCLFlBQVksU0FBcUIsR0FBRyxFQUFFLE9BQThCLENBQUU7SUFDcEUsS0FBSyxDQUFDLFNBQVM7SUFDZixJQUFJLENBQUMsR0FBRyxHQUFHLFNBQVM7SUFDcEIsSUFBSSxDQUFDLE1BQU0sR0FBRztFQUNoQjtFQUNBLGNBQXdCO0lBQ3RCLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtNQUNaLE9BQU8sSUFBSSxDQUFDLEdBQUc7SUFDakI7SUFDQSxPQUFPLElBQUksU0FBUyxJQUFJLENBQUMsT0FBTyxFQUFFO01BQ2hDLFFBQVEsSUFBSSxDQUFDLE1BQU07SUFDckI7RUFDRjtBQUNGIn0=
// denoCacheMetadata=5392803093593415957,10528197669500889439