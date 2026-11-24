import * as bcrypt from "./bcrypt/bcrypt.ts";
/**
 * Generate a hash for the plaintext password
 * Requires the --allow-net flag
 *
 * @export
 * @param {string} plaintext The password to hash
 * @param {(string | undefined)} [salt=undefined] The salt to use when hashing. Recommended to leave this undefined.
 * @returns {Promise<string>} The hashed password
 */ export async function hash(plaintext, salt = undefined) {
  let worker = new Worker(new URL("worker.ts", import.meta.url).toString(), {
    type: "module"
  });
  worker.postMessage({
    action: "hash",
    payload: {
      plaintext,
      salt
    }
  });
  return new Promise((resolve)=>{
    worker.onmessage = (event)=>{
      resolve(event.data);
      worker.terminate();
    };
  });
}
/**
 * Generates a salt using a number of log rounds
 * Requires the --allow-net flag
 *
 * @export
 * @param {(number | undefined)} [log_rounds=undefined] Number of log rounds to use. Recommended to leave this undefined.
 * @returns {Promise<string>} The generated salt
 */ export async function genSalt(log_rounds = undefined) {
  let worker = new Worker(new URL("worker.ts", import.meta.url).toString(), {
    type: "module"
  });
  worker.postMessage({
    action: "genSalt",
    payload: {
      log_rounds
    }
  });
  return new Promise((resolve)=>{
    worker.onmessage = (event)=>{
      resolve(event.data);
      worker.terminate();
    };
  });
}
/**
 * Check if a plaintext password matches a hash
 * Requires the --allow-net flag
 *
 * @export
 * @param {string} plaintext The plaintext password to check
 * @param {string} hash The hash to compare to
 * @returns {Promise<boolean>} Whether the password matches the hash
 */ export async function compare(plaintext, hash) {
  let worker = new Worker(new URL("worker.ts", import.meta.url).toString(), {
    type: "module"
  });
  worker.postMessage({
    action: "compare",
    payload: {
      plaintext,
      hash
    }
  });
  return new Promise((resolve)=>{
    worker.onmessage = (event)=>{
      resolve(event.data);
      worker.terminate();
    };
  });
}
/**
 * Check if a plaintext password matches a hash
 * This function is blocking and computationally expensive but requires no additonal flags.
 * Using the async variant is highly recommended.
 *
 * @export
 * @param {string} plaintext The plaintext password to check
 * @param {string} hash The hash to compare to
 * @returns {boolean} Whether the password matches the hash
 */ export function compareSync(plaintext, hash) {
  try {
    return bcrypt.checkpw(plaintext, hash);
  } catch  {
    return false;
  }
}
/**
 * Generates a salt using a number of log rounds
 * This function is blocking and computationally expensive but requires no additonal flags.
 * Using the async variant is highly recommended.
 *
 * @export
 * @param {(number | undefined)} [log_rounds=undefined] Number of log rounds to use. Recommended to leave this undefined.
 * @returns {string} The generated salt
 */ export function genSaltSync(log_rounds = undefined) {
  return bcrypt.gensalt(log_rounds);
}
/**
 * Generate a hash for the plaintext password
 * This function is blocking and computationally expensive but requires no additonal flags.
 * Using the async variant is highly recommended.
 *
 * @export
 * @param {string} plaintext The password to hash
 * @param {(string | undefined)} [salt=undefined] The salt to use when hashing. Recommended to leave this undefined.
 * @returns {string} The hashed password
 */ export function hashSync(plaintext, salt = undefined) {
  return bcrypt.hashpw(plaintext, salt);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9iY3J5cHQvc3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYmNyeXB0IGZyb20gXCIuL2JjcnlwdC9iY3J5cHQudHNcIjtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGhhc2ggZm9yIHRoZSBwbGFpbnRleHQgcGFzc3dvcmRcbiAqIFJlcXVpcmVzIHRoZSAtLWFsbG93LW5ldCBmbGFnXG4gKlxuICogQGV4cG9ydFxuICogQHBhcmFtIHtzdHJpbmd9IHBsYWludGV4dCBUaGUgcGFzc3dvcmQgdG8gaGFzaFxuICogQHBhcmFtIHsoc3RyaW5nIHwgdW5kZWZpbmVkKX0gW3NhbHQ9dW5kZWZpbmVkXSBUaGUgc2FsdCB0byB1c2Ugd2hlbiBoYXNoaW5nLiBSZWNvbW1lbmRlZCB0byBsZWF2ZSB0aGlzIHVuZGVmaW5lZC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPHN0cmluZz59IFRoZSBoYXNoZWQgcGFzc3dvcmRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhc2goXG4gIHBsYWludGV4dDogc3RyaW5nLFxuICBzYWx0OiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBsZXQgd29ya2VyID0gbmV3IFdvcmtlcihcbiAgICBuZXcgVVJMKFwid29ya2VyLnRzXCIsIGltcG9ydC5tZXRhLnVybCkudG9TdHJpbmcoKSxcbiAgICB7IHR5cGU6IFwibW9kdWxlXCIgfSxcbiAgKTtcblxuICB3b3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgIGFjdGlvbjogXCJoYXNoXCIsXG4gICAgcGF5bG9hZDoge1xuICAgICAgcGxhaW50ZXh0LFxuICAgICAgc2FsdCxcbiAgICB9LFxuICB9KTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICB3b3JrZXIub25tZXNzYWdlID0gKGV2ZW50KSA9PiB7XG4gICAgICByZXNvbHZlKGV2ZW50LmRhdGEpO1xuICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgIH07XG4gIH0pO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBhIHNhbHQgdXNpbmcgYSBudW1iZXIgb2YgbG9nIHJvdW5kc1xuICogUmVxdWlyZXMgdGhlIC0tYWxsb3ctbmV0IGZsYWdcbiAqXG4gKiBAZXhwb3J0XG4gKiBAcGFyYW0geyhudW1iZXIgfCB1bmRlZmluZWQpfSBbbG9nX3JvdW5kcz11bmRlZmluZWRdIE51bWJlciBvZiBsb2cgcm91bmRzIHRvIHVzZS4gUmVjb21tZW5kZWQgdG8gbGVhdmUgdGhpcyB1bmRlZmluZWQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxzdHJpbmc+fSBUaGUgZ2VuZXJhdGVkIHNhbHRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlblNhbHQoXG4gIGxvZ19yb3VuZHM6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGxldCB3b3JrZXIgPSBuZXcgV29ya2VyKFxuICAgIG5ldyBVUkwoXCJ3b3JrZXIudHNcIiwgaW1wb3J0Lm1ldGEudXJsKS50b1N0cmluZygpLFxuICAgIHsgdHlwZTogXCJtb2R1bGVcIiB9LFxuICApO1xuXG4gIHdvcmtlci5wb3N0TWVzc2FnZSh7XG4gICAgYWN0aW9uOiBcImdlblNhbHRcIixcbiAgICBwYXlsb2FkOiB7XG4gICAgICBsb2dfcm91bmRzLFxuICAgIH0sXG4gIH0pO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIHdvcmtlci5vbm1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcbiAgICAgIHJlc29sdmUoZXZlbnQuZGF0YSk7XG4gICAgICB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgfTtcbiAgfSk7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBwbGFpbnRleHQgcGFzc3dvcmQgbWF0Y2hlcyBhIGhhc2hcbiAqIFJlcXVpcmVzIHRoZSAtLWFsbG93LW5ldCBmbGFnXG4gKlxuICogQGV4cG9ydFxuICogQHBhcmFtIHtzdHJpbmd9IHBsYWludGV4dCBUaGUgcGxhaW50ZXh0IHBhc3N3b3JkIHRvIGNoZWNrXG4gKiBAcGFyYW0ge3N0cmluZ30gaGFzaCBUaGUgaGFzaCB0byBjb21wYXJlIHRvXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn0gV2hldGhlciB0aGUgcGFzc3dvcmQgbWF0Y2hlcyB0aGUgaGFzaFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29tcGFyZShcbiAgcGxhaW50ZXh0OiBzdHJpbmcsXG4gIGhhc2g6IHN0cmluZyxcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBsZXQgd29ya2VyID0gbmV3IFdvcmtlcihcbiAgICBuZXcgVVJMKFwid29ya2VyLnRzXCIsIGltcG9ydC5tZXRhLnVybCkudG9TdHJpbmcoKSxcbiAgICB7IHR5cGU6IFwibW9kdWxlXCIgfSxcbiAgKTtcblxuICB3b3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgIGFjdGlvbjogXCJjb21wYXJlXCIsXG4gICAgcGF5bG9hZDoge1xuICAgICAgcGxhaW50ZXh0LFxuICAgICAgaGFzaCxcbiAgICB9LFxuICB9KTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICB3b3JrZXIub25tZXNzYWdlID0gKGV2ZW50KSA9PiB7XG4gICAgICByZXNvbHZlKGV2ZW50LmRhdGEpO1xuICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgIH07XG4gIH0pO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGEgcGxhaW50ZXh0IHBhc3N3b3JkIG1hdGNoZXMgYSBoYXNoXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGJsb2NraW5nIGFuZCBjb21wdXRhdGlvbmFsbHkgZXhwZW5zaXZlIGJ1dCByZXF1aXJlcyBubyBhZGRpdG9uYWwgZmxhZ3MuXG4gKiBVc2luZyB0aGUgYXN5bmMgdmFyaWFudCBpcyBoaWdobHkgcmVjb21tZW5kZWQuXG4gKlxuICogQGV4cG9ydFxuICogQHBhcmFtIHtzdHJpbmd9IHBsYWludGV4dCBUaGUgcGxhaW50ZXh0IHBhc3N3b3JkIHRvIGNoZWNrXG4gKiBAcGFyYW0ge3N0cmluZ30gaGFzaCBUaGUgaGFzaCB0byBjb21wYXJlIHRvXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gV2hldGhlciB0aGUgcGFzc3dvcmQgbWF0Y2hlcyB0aGUgaGFzaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZVN5bmMocGxhaW50ZXh0OiBzdHJpbmcsIGhhc2g6IHN0cmluZyk6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIHJldHVybiBiY3J5cHQuY2hlY2twdyhwbGFpbnRleHQsIGhhc2gpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSBzYWx0IHVzaW5nIGEgbnVtYmVyIG9mIGxvZyByb3VuZHNcbiAqIFRoaXMgZnVuY3Rpb24gaXMgYmxvY2tpbmcgYW5kIGNvbXB1dGF0aW9uYWxseSBleHBlbnNpdmUgYnV0IHJlcXVpcmVzIG5vIGFkZGl0b25hbCBmbGFncy5cbiAqIFVzaW5nIHRoZSBhc3luYyB2YXJpYW50IGlzIGhpZ2hseSByZWNvbW1lbmRlZC5cbiAqXG4gKiBAZXhwb3J0XG4gKiBAcGFyYW0geyhudW1iZXIgfCB1bmRlZmluZWQpfSBbbG9nX3JvdW5kcz11bmRlZmluZWRdIE51bWJlciBvZiBsb2cgcm91bmRzIHRvIHVzZS4gUmVjb21tZW5kZWQgdG8gbGVhdmUgdGhpcyB1bmRlZmluZWQuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZ2VuZXJhdGVkIHNhbHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlblNhbHRTeW5jKFxuICBsb2dfcm91bmRzOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQsXG4pOiBzdHJpbmcge1xuICByZXR1cm4gYmNyeXB0LmdlbnNhbHQobG9nX3JvdW5kcyk7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBoYXNoIGZvciB0aGUgcGxhaW50ZXh0IHBhc3N3b3JkXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGJsb2NraW5nIGFuZCBjb21wdXRhdGlvbmFsbHkgZXhwZW5zaXZlIGJ1dCByZXF1aXJlcyBubyBhZGRpdG9uYWwgZmxhZ3MuXG4gKiBVc2luZyB0aGUgYXN5bmMgdmFyaWFudCBpcyBoaWdobHkgcmVjb21tZW5kZWQuXG4gKlxuICogQGV4cG9ydFxuICogQHBhcmFtIHtzdHJpbmd9IHBsYWludGV4dCBUaGUgcGFzc3dvcmQgdG8gaGFzaFxuICogQHBhcmFtIHsoc3RyaW5nIHwgdW5kZWZpbmVkKX0gW3NhbHQ9dW5kZWZpbmVkXSBUaGUgc2FsdCB0byB1c2Ugd2hlbiBoYXNoaW5nLiBSZWNvbW1lbmRlZCB0byBsZWF2ZSB0aGlzIHVuZGVmaW5lZC5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBoYXNoZWQgcGFzc3dvcmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc2hTeW5jKFxuICBwbGFpbnRleHQ6IHN0cmluZyxcbiAgc2FsdDogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkLFxuKTogc3RyaW5nIHtcbiAgcmV0dXJuIGJjcnlwdC5oYXNocHcocGxhaW50ZXh0LCBzYWx0KTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLFlBQVkscUJBQXFCO0FBRTdDOzs7Ozs7OztDQVFDLEdBQ0QsT0FBTyxlQUFlLEtBQ3BCLFNBQWlCLEVBQ2pCLE9BQTJCLFNBQVM7RUFFcEMsSUFBSSxTQUFTLElBQUksT0FDZixJQUFJLElBQUksYUFBYSxZQUFZLEdBQUcsRUFBRSxRQUFRLElBQzlDO0lBQUUsTUFBTTtFQUFTO0VBR25CLE9BQU8sV0FBVyxDQUFDO0lBQ2pCLFFBQVE7SUFDUixTQUFTO01BQ1A7TUFDQTtJQUNGO0VBQ0Y7RUFFQSxPQUFPLElBQUksUUFBUSxDQUFDO0lBQ2xCLE9BQU8sU0FBUyxHQUFHLENBQUM7TUFDbEIsUUFBUSxNQUFNLElBQUk7TUFDbEIsT0FBTyxTQUFTO0lBQ2xCO0VBQ0Y7QUFDRjtBQUVBOzs7Ozs7O0NBT0MsR0FDRCxPQUFPLGVBQWUsUUFDcEIsYUFBaUMsU0FBUztFQUUxQyxJQUFJLFNBQVMsSUFBSSxPQUNmLElBQUksSUFBSSxhQUFhLFlBQVksR0FBRyxFQUFFLFFBQVEsSUFDOUM7SUFBRSxNQUFNO0VBQVM7RUFHbkIsT0FBTyxXQUFXLENBQUM7SUFDakIsUUFBUTtJQUNSLFNBQVM7TUFDUDtJQUNGO0VBQ0Y7RUFFQSxPQUFPLElBQUksUUFBUSxDQUFDO0lBQ2xCLE9BQU8sU0FBUyxHQUFHLENBQUM7TUFDbEIsUUFBUSxNQUFNLElBQUk7TUFDbEIsT0FBTyxTQUFTO0lBQ2xCO0VBQ0Y7QUFDRjtBQUVBOzs7Ozs7OztDQVFDLEdBQ0QsT0FBTyxlQUFlLFFBQ3BCLFNBQWlCLEVBQ2pCLElBQVk7RUFFWixJQUFJLFNBQVMsSUFBSSxPQUNmLElBQUksSUFBSSxhQUFhLFlBQVksR0FBRyxFQUFFLFFBQVEsSUFDOUM7SUFBRSxNQUFNO0VBQVM7RUFHbkIsT0FBTyxXQUFXLENBQUM7SUFDakIsUUFBUTtJQUNSLFNBQVM7TUFDUDtNQUNBO0lBQ0Y7RUFDRjtFQUVBLE9BQU8sSUFBSSxRQUFRLENBQUM7SUFDbEIsT0FBTyxTQUFTLEdBQUcsQ0FBQztNQUNsQixRQUFRLE1BQU0sSUFBSTtNQUNsQixPQUFPLFNBQVM7SUFDbEI7RUFDRjtBQUNGO0FBRUE7Ozs7Ozs7OztDQVNDLEdBQ0QsT0FBTyxTQUFTLFlBQVksU0FBaUIsRUFBRSxJQUFZO0VBQ3pELElBQUk7SUFDRixPQUFPLE9BQU8sT0FBTyxDQUFDLFdBQVc7RUFDbkMsRUFBRSxPQUFNO0lBQ04sT0FBTztFQUNUO0FBQ0Y7QUFFQTs7Ozs7Ozs7Q0FRQyxHQUNELE9BQU8sU0FBUyxZQUNkLGFBQWlDLFNBQVM7RUFFMUMsT0FBTyxPQUFPLE9BQU8sQ0FBQztBQUN4QjtBQUVBOzs7Ozs7Ozs7Q0FTQyxHQUNELE9BQU8sU0FBUyxTQUNkLFNBQWlCLEVBQ2pCLE9BQTJCLFNBQVM7RUFFcEMsT0FBTyxPQUFPLE1BQU0sQ0FBQyxXQUFXO0FBQ2xDIn0=
// denoCacheMetadata=8629313010017795603,7835169334725209832