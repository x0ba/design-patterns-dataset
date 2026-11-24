import { Status, Types } from "./constants.ts";
import { getStr, setArr, setStr } from "./wasm.ts";
import { SqliteError } from "./error.ts";
export function wrapSqlFunction(wasm, name, func) {
  return (argCount)=>{
    // This logic is similar to how we read rows in `query.ts`
    const args = new Array(argCount);
    for(let argIdx = 0; argIdx < argCount; argIdx++){
      switch(wasm.argument_type(argIdx)){
        case Types.Integer:
          args[argIdx] = wasm.argument_int(argIdx);
          break;
        case Types.Float:
          args[argIdx] = wasm.argument_double(argIdx);
          break;
        case Types.Text:
          args[argIdx] = getStr(wasm, wasm.argument_text(argIdx));
          break;
        case Types.Blob:
          {
            const ptr = wasm.argument_blob(argIdx);
            if (ptr === 0) {
              // Zero pointer results in null
              args[argIdx] = null;
            } else {
              const length = wasm.argument_bytes(argIdx);
              // Slice should copy the bytes, as it makes a shallow copy
              args[argIdx] = new Uint8Array(wasm.memory.buffer, ptr, length).slice();
            }
            break;
          }
        case Types.BigInteger:
          {
            const ptr = wasm.argument_text(argIdx);
            args[argIdx] = BigInt(getStr(wasm, ptr));
            break;
          }
        default:
          args[argIdx] = null;
          break;
      }
    }
    try {
      let result = func.apply(null, args);
      // This logic is similar to how we bind query parameters in `query.ts`
      switch(typeof result){
        case "boolean":
          result = result ? 1 : 0;
        // fall through
        case "number":
          if (Number.isSafeInteger(result)) {
            wasm.result_int(result);
          } else {
            wasm.result_double(result);
          }
          break;
        case "bigint":
          // bigint is bound as two 32bit integers and reassembled on the C side
          if (result > 9223372036854775807n || result < -9223372036854775808n) {
            throw new SqliteError(`BigInt result ${result} overflows 64 bit integer.`);
          } else {
            const posVal = result >= 0n ? result : -result;
            const sign = result >= 0n ? 1 : -1;
            const upper = Number(BigInt.asUintN(32, posVal >> 32n));
            const lower = Number(BigInt.asUintN(32, posVal));
            wasm.result_big_int(sign, upper, lower);
          }
          break;
        case "string":
          setStr(wasm, result, (ptr)=>wasm.result_text(ptr));
          break;
        default:
          if (result instanceof Date) {
            // Dates are allowed and bound to TEXT, formatted `YYYY-MM-DDTHH:MM:SS.SSSZ`
            setStr(wasm, result.toISOString(), (ptr)=>wasm.result_text(ptr));
          } else if (result instanceof Uint8Array) {
            // Uint8Arrays are allowed and bound to BLOB
            const size = result.length;
            setArr(wasm, result, (ptr)=>wasm.result_blob(ptr, size));
          } else if (result === null || result === undefined) {
            // Both null and undefined result in a NULL entry
            wasm.result_null();
          } else {
            throw new SqliteError(`Can not return ${typeof result}.`);
          }
          break;
      }
    } catch (error) {
      setStr(wasm, `Error in user defined function '${name}': ${error?.message}`, (ptr)=>wasm.result_error(ptr, Status.SqliteError));
    }
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zcWxpdGUvc3JjL2Z1bmN0aW9uLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFdhc20gfSBmcm9tIFwiLi4vYnVpbGQvc3FsaXRlLmpzXCI7XG5pbXBvcnQgeyBTdGF0dXMsIFR5cGVzIH0gZnJvbSBcIi4vY29uc3RhbnRzLnRzXCI7XG5pbXBvcnQgeyBnZXRTdHIsIHNldEFyciwgc2V0U3RyIH0gZnJvbSBcIi4vd2FzbS50c1wiO1xuaW1wb3J0IHsgU3FsaXRlRXJyb3IgfSBmcm9tIFwiLi9lcnJvci50c1wiO1xuXG4vKipcbiAqIFBvc3NpYmxlIGFyZ3VtZW50cyBhIHVzZXItZGVmaW5lZCBTUUwgZnVuY3Rpb24gbWlnaHRcbiAqIHJlY2VpdmUuXG4gKlxuICogVGhlc2UgY29ycmVzcG9uZCB0byB0aGUgU1FMIHR5cGVzIGBJTlRFR0VSYCAobnVtYmVyLFxuICogYmlnaW50LCBvciBib29sZWFuKSwgYFJFQUxgIChudW1iZXIpLCBgVEVYVGAgKHN0cmluZyksXG4gKiBgQkxPQmAgKFVpbnQ4QXJyYXkpLCBhbmQgYE5VTExgIChudWxsKS5cbiAqXG4gKiBTZWUgYFF1ZXJ5UGFyYW1ldGVyYCBmb3IgbW9yZSBkZXRhaWxzIG9uIGhvdyBKUyB2YWx1ZXNcbiAqIGFyZSBjb252ZXJ0ZWQgdG8gYW5kIGZyb20gU1FMIHZhbHVlcy5cbiAqL1xuZXhwb3J0IHR5cGUgU3FsRnVuY3Rpb25Bcmd1bWVudCA9XG4gIHwgYm9vbGVhblxuICB8IG51bWJlclxuICB8IGJpZ2ludFxuICB8IHN0cmluZ1xuICB8IG51bGxcbiAgfCBVaW50OEFycmF5O1xuXG4vKipcbiAqIFZhbHVlcyBhIHVzZXItZGVmaW5lZCBTUUwgZnVuY3Rpb24gaXMgYWxsb3dlZCB0b1xuICogcmV0dXJuLlxuICpcbiAqIFRoZXNlIGNvcnJlc3BvbmQgdG8gaG93IGBRdWVyeVBhcmFtZXRlcmBzIGFyZVxuICogY29udmVydGVkIHdoZW4gYm91bmQgdG8gcXVlcmllcy4gQWRkaXRpb25hbGx5IGFcbiAqIHVzZXItZGVmaW5lZCBmdW5jdGlvbiBtYXkgcmV0dXJuIGB2b2lkYCAoZS5nLiBhcyBpblxuICogYHJldHVybjtgKSwgaW4gd2hpY2ggY2FzZSBhIGBOVUxMYCB2YWx1ZSBpcyByZXR1cm5lZFxuICogb24gdGhlIFNRTCBzaWRlLlxuICovXG5leHBvcnQgdHlwZSBTcWxGdW5jdGlvblJlc3VsdCA9XG4gIHwgdm9pZFxuICB8IGJvb2xlYW5cbiAgfCBudW1iZXJcbiAgfCBiaWdpbnRcbiAgfCBzdHJpbmdcbiAgfCBudWxsXG4gIHwgdW5kZWZpbmVkXG4gIHwgRGF0ZVxuICB8IFVpbnQ4QXJyYXk7XG5cbmV4cG9ydCB0eXBlIFNxbEZ1bmN0aW9uID0gKFxuICAuLi5hcmdzOiBBcnJheTxTcWxGdW5jdGlvbkFyZ3VtZW50PlxuKSA9PiBTcWxGdW5jdGlvblJlc3VsdDtcblxuZXhwb3J0IGZ1bmN0aW9uIHdyYXBTcWxGdW5jdGlvbihcbiAgd2FzbTogV2FzbSxcbiAgbmFtZTogc3RyaW5nLFxuICBmdW5jOiBTcWxGdW5jdGlvbixcbik6IChhcmdjOiBudW1iZXIpID0+IHZvaWQge1xuICByZXR1cm4gKGFyZ0NvdW50OiBudW1iZXIpID0+IHtcbiAgICAvLyBUaGlzIGxvZ2ljIGlzIHNpbWlsYXIgdG8gaG93IHdlIHJlYWQgcm93cyBpbiBgcXVlcnkudHNgXG4gICAgY29uc3QgYXJnczogQXJyYXk8U3FsRnVuY3Rpb25Bcmd1bWVudD4gPSBuZXcgQXJyYXkoYXJnQ291bnQpO1xuICAgIGZvciAobGV0IGFyZ0lkeCA9IDA7IGFyZ0lkeCA8IGFyZ0NvdW50OyBhcmdJZHgrKykge1xuICAgICAgc3dpdGNoICh3YXNtLmFyZ3VtZW50X3R5cGUoYXJnSWR4KSkge1xuICAgICAgICBjYXNlIFR5cGVzLkludGVnZXI6XG4gICAgICAgICAgYXJnc1thcmdJZHhdID0gd2FzbS5hcmd1bWVudF9pbnQoYXJnSWR4KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBUeXBlcy5GbG9hdDpcbiAgICAgICAgICBhcmdzW2FyZ0lkeF0gPSB3YXNtLmFyZ3VtZW50X2RvdWJsZShhcmdJZHgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFR5cGVzLlRleHQ6XG4gICAgICAgICAgYXJnc1thcmdJZHhdID0gZ2V0U3RyKHdhc20sIHdhc20uYXJndW1lbnRfdGV4dChhcmdJZHgpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBUeXBlcy5CbG9iOiB7XG4gICAgICAgICAgY29uc3QgcHRyID0gd2FzbS5hcmd1bWVudF9ibG9iKGFyZ0lkeCk7XG4gICAgICAgICAgaWYgKHB0ciA9PT0gMCkge1xuICAgICAgICAgICAgLy8gWmVybyBwb2ludGVyIHJlc3VsdHMgaW4gbnVsbFxuICAgICAgICAgICAgYXJnc1thcmdJZHhdID0gbnVsbDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbGVuZ3RoID0gd2FzbS5hcmd1bWVudF9ieXRlcyhhcmdJZHgpO1xuICAgICAgICAgICAgLy8gU2xpY2Ugc2hvdWxkIGNvcHkgdGhlIGJ5dGVzLCBhcyBpdCBtYWtlcyBhIHNoYWxsb3cgY29weVxuICAgICAgICAgICAgYXJnc1thcmdJZHhdID0gbmV3IFVpbnQ4QXJyYXkod2FzbS5tZW1vcnkuYnVmZmVyLCBwdHIsIGxlbmd0aClcbiAgICAgICAgICAgICAgLnNsaWNlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZXMuQmlnSW50ZWdlcjoge1xuICAgICAgICAgIGNvbnN0IHB0ciA9IHdhc20uYXJndW1lbnRfdGV4dChhcmdJZHgpO1xuICAgICAgICAgIGFyZ3NbYXJnSWR4XSA9IEJpZ0ludChnZXRTdHIod2FzbSwgcHRyKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBhcmdzW2FyZ0lkeF0gPSBudWxsO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBsZXQgcmVzdWx0ID0gZnVuYy5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgIC8vIFRoaXMgbG9naWMgaXMgc2ltaWxhciB0byBob3cgd2UgYmluZCBxdWVyeSBwYXJhbWV0ZXJzIGluIGBxdWVyeS50c2BcbiAgICAgIHN3aXRjaCAodHlwZW9mIHJlc3VsdCkge1xuICAgICAgICBjYXNlIFwiYm9vbGVhblwiOlxuICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdCA/IDEgOiAwO1xuICAgICAgICAgIC8vIGZhbGwgdGhyb3VnaFxuICAgICAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICAgICAgaWYgKE51bWJlci5pc1NhZmVJbnRlZ2VyKHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHdhc20ucmVzdWx0X2ludChyZXN1bHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3YXNtLnJlc3VsdF9kb3VibGUocmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJiaWdpbnRcIjpcbiAgICAgICAgICAvLyBiaWdpbnQgaXMgYm91bmQgYXMgdHdvIDMyYml0IGludGVnZXJzIGFuZCByZWFzc2VtYmxlZCBvbiB0aGUgQyBzaWRlXG4gICAgICAgICAgaWYgKHJlc3VsdCA+IDkyMjMzNzIwMzY4NTQ3NzU4MDduIHx8IHJlc3VsdCA8IC05MjIzMzcyMDM2ODU0Nzc1ODA4bikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKFxuICAgICAgICAgICAgICBgQmlnSW50IHJlc3VsdCAke3Jlc3VsdH0gb3ZlcmZsb3dzIDY0IGJpdCBpbnRlZ2VyLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBwb3NWYWwgPSByZXN1bHQgPj0gMG4gPyByZXN1bHQgOiAtcmVzdWx0O1xuICAgICAgICAgICAgY29uc3Qgc2lnbiA9IHJlc3VsdCA+PSAwbiA/IDEgOiAtMTtcbiAgICAgICAgICAgIGNvbnN0IHVwcGVyID0gTnVtYmVyKEJpZ0ludC5hc1VpbnROKDMyLCBwb3NWYWwgPj4gMzJuKSk7XG4gICAgICAgICAgICBjb25zdCBsb3dlciA9IE51bWJlcihCaWdJbnQuYXNVaW50TigzMiwgcG9zVmFsKSk7XG4gICAgICAgICAgICB3YXNtLnJlc3VsdF9iaWdfaW50KHNpZ24sIHVwcGVyLCBsb3dlcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgc2V0U3RyKHdhc20sIHJlc3VsdCwgKHB0cikgPT4gd2FzbS5yZXN1bHRfdGV4dChwdHIpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgLy8gRGF0ZXMgYXJlIGFsbG93ZWQgYW5kIGJvdW5kIHRvIFRFWFQsIGZvcm1hdHRlZCBgWVlZWS1NTS1ERFRISDpNTTpTUy5TU1NaYFxuICAgICAgICAgICAgc2V0U3RyKHdhc20sIHJlc3VsdC50b0lTT1N0cmluZygpLCAocHRyKSA9PiB3YXNtLnJlc3VsdF90ZXh0KHB0cikpO1xuICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0IGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICAgICAgLy8gVWludDhBcnJheXMgYXJlIGFsbG93ZWQgYW5kIGJvdW5kIHRvIEJMT0JcbiAgICAgICAgICAgIGNvbnN0IHNpemUgPSByZXN1bHQubGVuZ3RoO1xuICAgICAgICAgICAgc2V0QXJyKHdhc20sIHJlc3VsdCwgKHB0cikgPT4gd2FzbS5yZXN1bHRfYmxvYihwdHIsIHNpemUpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCByZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gQm90aCBudWxsIGFuZCB1bmRlZmluZWQgcmVzdWx0IGluIGEgTlVMTCBlbnRyeVxuICAgICAgICAgICAgd2FzbS5yZXN1bHRfbnVsbCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoYENhbiBub3QgcmV0dXJuICR7dHlwZW9mIHJlc3VsdH0uYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBzZXRTdHIoXG4gICAgICAgIHdhc20sXG4gICAgICAgIGBFcnJvciBpbiB1c2VyIGRlZmluZWQgZnVuY3Rpb24gJyR7bmFtZX0nOiAke1xuICAgICAgICAgIChlcnJvciBhcyBFcnJvcik/Lm1lc3NhZ2VcbiAgICAgICAgfWAsXG4gICAgICAgIChwdHIpID0+IHdhc20ucmVzdWx0X2Vycm9yKHB0ciwgU3RhdHVzLlNxbGl0ZUVycm9yKSxcbiAgICAgICk7XG4gICAgfVxuICB9O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLFNBQVMsTUFBTSxFQUFFLEtBQUssUUFBUSxpQkFBaUI7QUFDL0MsU0FBUyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sUUFBUSxZQUFZO0FBQ25ELFNBQVMsV0FBVyxRQUFRLGFBQWE7QUE4Q3pDLE9BQU8sU0FBUyxnQkFDZCxJQUFVLEVBQ1YsSUFBWSxFQUNaLElBQWlCO0VBRWpCLE9BQU8sQ0FBQztJQUNOLDBEQUEwRDtJQUMxRCxNQUFNLE9BQW1DLElBQUksTUFBTTtJQUNuRCxJQUFLLElBQUksU0FBUyxHQUFHLFNBQVMsVUFBVSxTQUFVO01BQ2hELE9BQVEsS0FBSyxhQUFhLENBQUM7UUFDekIsS0FBSyxNQUFNLE9BQU87VUFDaEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLFlBQVksQ0FBQztVQUNq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
// denoCacheMetadata=15276281685642900753,4781559421536527664