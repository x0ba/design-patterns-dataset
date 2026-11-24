var _computedKey;
import { getStr, setArr, setStr } from "./wasm.ts";
import { Status, Types, Values } from "./constants.ts";
import { SqliteError } from "./error.ts";
_computedKey = Symbol.iterator;
/**
 * A prepared query which can be executed many
 * times.
 */ export class PreparedQuery {
  #wasm;
  #stmt;
  #openStatements;
  #status;
  #iterKv;
  #rowKeys;
  #finalized;
  /**
   * This constructor should never be used directly.
   * Instead a prepared query can be obtained by
   * calling `DB.prepareQuery`.
   */ constructor(wasm, stmt, openStatements){
    this.#wasm = wasm;
    this.#stmt = stmt;
    this.#openStatements = openStatements;
    this.#status = Status.Unknown;
    this.#iterKv = false;
    this.#finalized = false;
  }
  #startQuery(params) {
    if (this.#finalized) {
      throw new SqliteError("Query is finalized.");
    }
    // Reset query
    this.#wasm.reset(this.#stmt);
    this.#wasm.clear_bindings(this.#stmt);
    // Prepare parameter array
    let parameters = [];
    if (Array.isArray(params)) {
      parameters = params;
    } else if (typeof params === "object") {
      // Resolve parameter index for named parameter
      for (const key of Object.keys(params)){
        let name = key;
        // blank names default to ':'
        if (name[0] !== ":" && name[0] !== "@" && name[0] !== "$") {
          name = `:${name}`;
        }
        const idx = setStr(this.#wasm, name, (ptr)=>this.#wasm.bind_parameter_index(this.#stmt, ptr));
        if (idx === Values.Error) {
          throw new SqliteError(`No parameter named '${name}'.`);
        }
        parameters[idx - 1] = params[key];
      }
    }
    // Bind parameters
    for(let i = 0; i < parameters.length; i++){
      let value = parameters[i];
      let status;
      switch(typeof value){
        case "boolean":
          value = value ? 1 : 0;
        // fall through
        case "number":
          if (Number.isSafeInteger(value)) {
            status = this.#wasm.bind_int(this.#stmt, i + 1, value);
          } else {
            status = this.#wasm.bind_double(this.#stmt, i + 1, value);
          }
          break;
        case "bigint":
          // bigint is bound as two 32bit integers and reassembled on the C side
          if (value > 9223372036854775807n || value < -9223372036854775808n) {
            throw new SqliteError(`BigInt value ${value} overflows 64 bit integer.`);
          } else {
            const posVal = value >= 0n ? value : -value;
            const sign = value >= 0n ? 1 : -1;
            const upper = Number(BigInt.asUintN(32, posVal >> 32n));
            const lower = Number(BigInt.asUintN(32, posVal));
            status = this.#wasm.bind_big_int(this.#stmt, i + 1, sign, upper, lower);
          }
          break;
        case "string":
          status = setStr(this.#wasm, value, (ptr)=>this.#wasm.bind_text(this.#stmt, i + 1, ptr));
          break;
        default:
          if (value instanceof Date) {
            // Dates are allowed and bound to TEXT, formatted `YYYY-MM-DDTHH:MM:SS.SSSZ`
            status = setStr(this.#wasm, value.toISOString(), (ptr)=>this.#wasm.bind_text(this.#stmt, i + 1, ptr));
          } else if (value instanceof Uint8Array) {
            // Uint8Arrays are allowed and bound to BLOB
            const size = value.length;
            status = setArr(this.#wasm, value, (ptr)=>this.#wasm.bind_blob(this.#stmt, i + 1, ptr, size));
          } else if (value === null || value === undefined) {
            // Both null and undefined result in a NULL entry
            status = this.#wasm.bind_null(this.#stmt, i + 1);
          } else {
            throw new SqliteError(`Can not bind ${typeof value}.`);
          }
          break;
      }
      if (status !== Status.SqliteOk) {
        throw new SqliteError(this.#wasm, status);
      }
    }
  }
  #getQueryRow() {
    if (this.#finalized) {
      throw new SqliteError("Query is finalized.");
    }
    const columnCount = this.#wasm.column_count(this.#stmt);
    const row = new Array(columnCount);
    for(let columnIdx = 0; columnIdx < columnCount; columnIdx++){
      switch(this.#wasm.column_type(this.#stmt, columnIdx)){
        case Types.Integer:
          row[columnIdx] = this.#wasm.column_int(this.#stmt, columnIdx);
          break;
        case Types.Float:
          row[columnIdx] = this.#wasm.column_double(this.#stmt, columnIdx);
          break;
        case Types.Text:
          row[columnIdx] = getStr(this.#wasm, this.#wasm.column_text(this.#stmt, columnIdx));
          break;
        case Types.Blob:
          {
            const ptr = this.#wasm.column_blob(this.#stmt, columnIdx);
            if (ptr === 0) {
              // Zero pointer results in null
              row[columnIdx] = null;
            } else {
              const length = this.#wasm.column_bytes(this.#stmt, columnIdx);
              // Slice should copy the bytes, as it makes a shallow copy
              row[columnIdx] = new Uint8Array(this.#wasm.memory.buffer, ptr, length).slice();
            }
            break;
          }
        case Types.BigInteger:
          {
            const ptr = this.#wasm.column_text(this.#stmt, columnIdx);
            row[columnIdx] = BigInt(getStr(this.#wasm, ptr));
            break;
          }
        default:
          // TODO(dyedgreen): Differentiate between NULL and not-recognized?
          row[columnIdx] = null;
          break;
      }
    }
    return row;
  }
  #makeRowObject(row) {
    if (this.#rowKeys == null) {
      const rowCount = this.#wasm.column_count(this.#stmt);
      this.#rowKeys = [];
      for(let i = 0; i < rowCount; i++){
        this.#rowKeys.push(getStr(this.#wasm, this.#wasm.column_name(this.#stmt, i)));
      }
    }
    const obj = row.reduce((obj, val, idx)=>{
      obj[this.#rowKeys[idx]] = val;
      return obj;
    }, {});
    return obj;
  }
  /**
   * Binds the given parameters to the query
   * and returns an iterator over rows.
   *
   * Using an iterator avoids loading all returned
   * rows into memory and hence allows to process a large
   * number of rows.
   *
   * Calling `iter`, `all`, or `first` invalidates any iterators
   * previously returned from this prepared query.
   *
   * # Examples
   *
   * ```typescript
   * const query = db.prepareQuery<[number, string]>("SELECT id, name FROM people");
   * for (const [id, name] of query.iter()) {
   *   // ...
   * }
   * ```
   *
   * To avoid SQL injection, user-provided values
   * should always be passed to the database through
   * a query parameter.
   *
   * ```typescript
   * const query = db.prepareQuery("SELECT id FROM people WHERE name = ?");
   * query.iter([name]);
   * ```
   *
   * ```typescript
   * const query = db.prepareQuery("SELECT id FROM people WHERE name = :name");
   * query.iter({ name });
   * ```
   *
   * See `QueryParameterSet` for documentation on
   * how values can be bound to SQL statements.
   *
   * See `QueryParameter` for documentation on how
   * values are returned from the database.
   */ iter(params) {
    this.#startQuery(params);
    this.#status = this.#wasm.step(this.#stmt);
    if (this.#status !== Status.SqliteRow && this.#status !== Status.SqliteDone) {
      throw new SqliteError(this.#wasm, this.#status);
    }
    this.#iterKv = false;
    return this;
  }
  /**
   * Like `iter` except each row is returned
   * as an object containing key-value pairs.
   *
   * # Example
   *
   * ```typescript
   * const query = db.prepareQuery<[number, string], { id: number, name: string }>("SELECT id, name FROM people");
   * for (const { id, name } of query.iterEntries()) {
   *   // ...
   * }
   * ```
   */ iterEntries(params) {
    this.iter(params);
    this.#iterKv = true;
    return this;
  }
  /**
   * @ignore
   *
   * Implements the iterable protocol. It is
   * a bug to call this method directly.
   */ [_computedKey]() {
    return this;
  }
  /**
   * @ignore
   *
   * Implements the iterator protocol. It is
   * a bug to call this method directly.
   */ next() {
    if (this.#status === Status.SqliteRow) {
      const value = this.#getQueryRow();
      this.#status = this.#wasm.step(this.#stmt);
      if (this.#iterKv) {
        return {
          value: this.#makeRowObject(value),
          done: false
        };
      } else {
        return {
          value,
          done: false
        };
      }
    } else if (this.#status === Status.SqliteDone) {
      return {
        value: null,
        done: true
      };
    } else {
      throw new SqliteError(this.#wasm, this.#status);
    }
  }
  /**
   * Binds the given parameters to the query
   * and returns an array containing all resulting
   * rows.
   *
   * # Examples
   *
   * ```typescript
   * const query = db.prepareQuery<[number, string]>("SELECT id, name FROM people");
   * const rows = query.all();
   * // rows = [[1, "Peter"], ...]
   * ```
   *
   * To avoid SQL injection, user-provided values
   * should always be passed to the database through
   * a query parameter.
   *
   * ```typescript
   * const query = db.prepareQuery("SELECT id FROM people WHERE name = ?");
   * query.all([name]);
   * ```
   *
   * ```typescript
   * const query = db.prepareQuery("SELECT id FROM people WHERE name = :name");
   * query.all({ name });
   * ```
   *
   * See `QueryParameterSet` for documentation on
   * how values can be bound to SQL statements.
   *
   * See `QueryParameter` for documentation on how
   * values are returned from the database.
   */ all(params) {
    this.#startQuery(params);
    const rows = [];
    this.#status = this.#wasm.step(this.#stmt);
    while(this.#status === Status.SqliteRow){
      rows.push(this.#getQueryRow());
      this.#status = this.#wasm.step(this.#stmt);
    }
    if (this.#status !== Status.SqliteDone) {
      throw new SqliteError(this.#wasm, this.#status);
    }
    return rows;
  }
  /**
   * Like `all` except each row is returned
   * as an object containing key-value pairs.
   *
   * # Example
   *
   * ```typescript
   * const query = db.prepareQuery<[number, string], { id: number, name: string }>("SELECT id, name FROM people");
   * const rows = query.allEntries();
   * // rows = [{ id: 1, name: "Peter" }, ...]
   * ```
   */ allEntries(params) {
    return this.all(params).map((row)=>this.#makeRowObject(row));
  }
  /**
   * Binds the given parameters to the query
   * and returns the first resulting row or
   * `undefined` when there are no rows returned
   * by the query.
   *
   * # Examples
   *
   * ```typescript
   * const query = db.prepareQuery<[number, string]>("SELECT id, name FROM people");
   * const person = query.first();
   * // person = [1, "Peter"]
   * ```
   *
   * ```typescript
   * const query = db.prepareQuery("SELECT id, name FROM people WHERE name = ?");
   * const person = query.first(["not a name"]);
   * // person = undefined
   * ```
   *
   * To avoid SQL injection, user-provided values
   * should always be passed to the database through
   * a query parameter.
   *
   * ```typescript
   * const query = db.prepareQuery("SELECT id FROM people WHERE name = ?");
   * query.first([name]);
   * ```
   *
   * ```typescript
   * const query = db.prepareQuery("SELECT id FROM people WHERE name = :name");
   * query.first({ name });
   * ```
   *
   * See `QueryParameterSet` for documentation on
   * how values can be bound to SQL statements.
   *
   * See `QueryParameter` for documentation on how
   * values are returned from the database.
   */ first(params) {
    this.#startQuery(params);
    this.#status = this.#wasm.step(this.#stmt);
    let row = undefined;
    if (this.#status === Status.SqliteRow) {
      row = this.#getQueryRow();
    }
    while(this.#status === Status.SqliteRow){
      this.#status = this.#wasm.step(this.#stmt);
    }
    if (this.#status !== Status.SqliteDone) {
      throw new SqliteError(this.#wasm, this.#status);
    }
    return row;
  }
  /**
   * Like `first` except the row is returned
   * as an object containing key-value pairs.
   *
   * # Example
   *
   * ```typescript
   * const query = db.prepareQuery<[number, string], { id: number, name: string }>("SELECT id, name FROM people");
   * const person = query.firstEntry();
   * // person = { id: 1, name: "Peter" }
   * ```
   */ firstEntry(params) {
    const row = this.first(params);
    return row === undefined ? undefined : this.#makeRowObject(row);
  }
  /**
   * **Deprecated:** prefer `first`.
   */ one(params) {
    const rows = this.all(params);
    if (rows.length === 0) {
      throw new SqliteError("The query did not return any rows.");
    } else if (rows.length > 1) {
      throw new SqliteError("The query returned more than one row.");
    } else {
      return rows[0];
    }
  }
  /**
   * **Deprecated:** prefer `firstEntry`.
   */ oneEntry(params) {
    return this.#makeRowObject(this.one(params));
  }
  /**
   * Binds the given parameters to the query and
   * executes the query, ignoring any rows which
   * might be returned.
   *
   * Using this method is more efficient when the
   * rows returned by a query are not needed or
   * the query does not return any rows.
   *
   * # Examples
   *
   * ```typescript
   * const query = db.prepareQuery<never, never, [string]>("INSERT INTO people (name) VALUES (?)");
   * query.execute(["Peter"]);
   * ```
   *
   * ```typescript
   * const query = db.prepareQuery<never, never, { name: string }>("INSERT INTO people (name) VALUES (:name)");
   * query.execute({ name: "Peter" });
   * ```
   *
   * See `QueryParameterSet` for documentation on
   * how values can be bound to SQL statements.
   *
   * See `QueryParameter` for documentation on how
   * values are returned from the database.
   */ execute(params) {
    this.#startQuery(params);
    this.#status = this.#wasm.step(this.#stmt);
    while(this.#status === Status.SqliteRow){
      this.#status = this.#wasm.step(this.#stmt);
    }
    if (this.#status !== Status.SqliteDone) {
      throw new SqliteError(this.#wasm, this.#status);
    }
  }
  /**
   * Closes the prepared query. This must be
   * called once the query is no longer needed
   * to avoid leaking resources.
   *
   * After a prepared query has been finalized,
   * calls to `iter`, `all`, `first`, `execute`,
   * or `columns` will fail.
   *
   * Using iterators which were previously returned
   * from the finalized query will fail.
   *
   * `finalize` may safely be called multiple
   * times.
   */ finalize() {
    if (!this.#finalized) {
      this.#wasm.finalize(this.#stmt);
      this.#openStatements.delete(this.#stmt);
      this.#finalized = true;
    }
  }
  /**
   * Returns the column names for this query.
   */ columns() {
    if (this.#finalized) {
      throw new SqliteError("Unable to retrieve column names from finalized transaction.");
    }
    const columnCount = this.#wasm.column_count(this.#stmt);
    const columns = [];
    for(let i = 0; i < columnCount; i++){
      const name = getStr(this.#wasm, this.#wasm.column_name(this.#stmt, i));
      const originName = getStr(this.#wasm, this.#wasm.column_origin_name(this.#stmt, i));
      const tableName = getStr(this.#wasm, this.#wasm.column_table_name(this.#stmt, i));
      columns.push({
        name,
        originName,
        tableName
      });
    }
    return columns;
  }
  /**
   * Returns the SQL string used to construct this
   * query, substituting placeholders (e.g. `?`) with
   * their values supplied in `params`.
   *
   * Calling this function invalidates any iterators
   * previously returned by calls to `iter`.
   *
   * See `QueryParameterSet` for documentation on
   * how values can be bound to SQL statements.
   */ expandSql(params) {
    this.#startQuery(params);
    const ptr = this.#wasm.expanded_sql(this.#stmt);
    const sql = getStr(this.#wasm, ptr);
    if (ptr != Values.Null) this.#wasm.sqlite_free(ptr);
    return sql;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zcWxpdGUvc3JjL3F1ZXJ5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YXRlbWVudFB0ciwgV2FzbSB9IGZyb20gXCIuLi9idWlsZC9zcWxpdGUuanNcIjtcbmltcG9ydCB7IGdldFN0ciwgc2V0QXJyLCBzZXRTdHIgfSBmcm9tIFwiLi93YXNtLnRzXCI7XG5pbXBvcnQgeyBTdGF0dXMsIFR5cGVzLCBWYWx1ZXMgfSBmcm9tIFwiLi9jb25zdGFudHMudHNcIjtcbmltcG9ydCB7IFNxbGl0ZUVycm9yIH0gZnJvbSBcIi4vZXJyb3IudHNcIjtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCB0eXBlIGZvciByZXR1cm5lZCByb3dzLlxuICovXG5leHBvcnQgdHlwZSBSb3cgPSBBcnJheTx1bmtub3duPjtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCB0eXBlIGZvciByb3cgcmV0dXJuZWRcbiAqIGFzIG9iamVjdHMuXG4gKi9cbmV4cG9ydCB0eXBlIFJvd09iamVjdCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4vKipcbiAqIFBvc3NpYmxlIHBhcmFtZXRlciB2YWx1ZXMgdG8gYmUgYm91bmQgdG8gYSBxdWVyeS5cbiAqXG4gKiBXaGVuIHZhbHVlcyBhcmUgYm91bmQgdG8gYSBxdWVyeSwgdGhleSBhcmVcbiAqIGNvbnZlcnRlZCBiZXR3ZWVuIEphdmFTY3JpcHQgYW5kIFNRTGl0ZSB0eXBlc1xuICogaW4gdGhlIGZvbGxvd2luZyB3YXk6XG4gKlxuICogfCBKUyB0eXBlIGluIHwgU1FMIHR5cGUgICAgICAgIHwgSlMgdHlwZSBvdXQgICAgICB8XG4gKiB8LS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLXxcbiAqIHwgbnVtYmVyICAgICB8IElOVEVHRVIgb3IgUkVBTCB8IG51bWJlciAgICAgICAgICAgfFxuICogfCBiaWdpbnQgICAgIHwgSU5URUdFUiAgICAgICAgIHwgbnVtYmVyIG9yIGJpZ2ludCB8XG4gKiB8IGJvb2xlYW4gICAgfCBJTlRFR0VSICAgICAgICAgfCBudW1iZXIgICAgICAgICAgIHxcbiAqIHwgc3RyaW5nICAgICB8IFRFWFQgICAgICAgICAgICB8IHN0cmluZyAgICAgICAgICAgfFxuICogfCBEYXRlICAgICAgIHwgVEVYVCAgICAgICAgICAgIHwgc3RyaW5nICAgICAgICAgICB8XG4gKiB8IFVpbnQ4QXJyYXkgfCBCTE9CICAgICAgICAgICAgfCBVaW50OEFycmF5ICAgICAgIHxcbiAqIHwgbnVsbCAgICAgICB8IE5VTEwgICAgICAgICAgICB8IG51bGwgICAgICAgICAgICAgfFxuICogfCB1bmRlZmluZWQgIHwgTlVMTCAgICAgICAgICAgIHwgbnVsbCAgICAgICAgICAgICB8XG4gKlxuICogSWYgbm8gdmFsdWUgaXMgcHJvdmlkZWQgZm9yIGEgZ2l2ZW4gcGFyYW1ldGVyLFxuICogU1FMaXRlIHdpbGwgZGVmYXVsdCB0byBOVUxMLlxuICpcbiAqIElmIGEgYGJpZ2ludGAgaXMgYm91bmQsIGl0IGlzIGNvbnZlcnRlZCB0byBhXG4gKiBzaWduZWQgNjQgYml0IGludGVnZXIsIHdoaWNoIG1heSBvdmVyZmxvdy5cbiAqXG4gKiBJZiBhbiBpbnRlZ2VyIHZhbHVlIGlzIHJlYWQgZnJvbSB0aGUgZGF0YWJhc2UsIHdoaWNoXG4gKiBpcyB0b28gYmlnIHRvIHNhZmVseSBiZSBjb250YWluZWQgaW4gYSBgbnVtYmVyYCwgaXRcbiAqIGlzIGF1dG9tYXRpY2FsbHkgcmV0dXJuZWQgYXMgYSBgYmlnaW50YC5cbiAqXG4gKiBJZiBhIGBEYXRlYCBpcyBib3VuZCwgaXQgd2lsbCBiZSBjb252ZXJ0ZWQgdG9cbiAqIGFuIElTTyA4NjAxIHN0cmluZzogYFlZWVktTU0tRERUSEg6TU06U1MuU1NTWmAuXG4gKiBUaGlzIGZvcm1hdCBpcyB1bmRlcnN0b29kIGJ5IGJ1aWx0LWluIFNRTGl0ZVxuICogZGF0ZS10aW1lIGZ1bmN0aW9ucy4gQWxzbyBzZWUgaHR0cHM6Ly9zcWxpdGUub3JnL2xhbmdfZGF0ZWZ1bmMuaHRtbC5cbiAqL1xuZXhwb3J0IHR5cGUgUXVlcnlQYXJhbWV0ZXIgPVxuICB8IGJvb2xlYW5cbiAgfCBudW1iZXJcbiAgfCBiaWdpbnRcbiAgfCBzdHJpbmdcbiAgfCBudWxsXG4gIHwgdW5kZWZpbmVkXG4gIHwgRGF0ZVxuICB8IFVpbnQ4QXJyYXk7XG5cbi8qKlxuICogQSBzZXQgb2YgcXVlcnkgcGFyYW1ldGVycy5cbiAqXG4gKiBXaGVuIGEgcXVlcnkgaXMgY29uc3RydWN0ZWQsIGl0IGNhbiBjb250YWluXG4gKiBlaXRoZXIgcG9zaXRpb25hbCBvciBuYW1lZCBwYXJhbWV0ZXJzLiBGb3JcbiAqIG1vcmUgaW5mb3JtYXRpb24gc2VlIGh0dHBzOi8vd3d3LnNxbGl0ZS5vcmcvbGFuZ19leHByLmh0bWwjcGFyYW1ldGVycy5cbiAqXG4gKiBBIHNldCBvZiBwYXJhbWV0ZXJzIGNhbiBiZSBwYXNzZWQgdG9cbiAqIGEgcXVlcnkgbWV0aG9kIGVpdGhlciBhcyBhbiBhcnJheSBvZlxuICogcGFyYW1ldGVycyAoaW4gcG9zaXRpb25hbCBvcmRlciksIG9yXG4gKiBhcyBhbiBvYmplY3Qgd2hpY2ggbWFwcyBwYXJhbWV0ZXIgbmFtZXNcbiAqIHRvIHRoZWlyIHZhbHVlczpcbiAqXG4gKiB8IFNRTCBQYXJhbWV0ZXIgfCBRdWVyeVBhcmFtZXRlclNldCAgICAgICB8XG4gKiB8LS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS18XG4gKiB8IGA/Tk5OYCBvciBgP2AgfCBOTk4tdGggdmFsdWUgaW4gYXJyYXkgICB8XG4gKiB8IGA6QUFBQWAgICAgICAgfCB2YWx1ZSBgQUFBQWAgb3IgYDpBQUFBYCB8XG4gKiB8IGBAQUFBQWAgICAgICAgfCB2YWx1ZSBgQEFBQUFgICAgICAgICAgICB8XG4gKiB8IGAkQUFBQWAgICAgICAgfCB2YWx1ZSBgJEFBQUFgICAgICAgICAgICB8XG4gKlxuICogU2VlIGBRdWVyeVBhcmFtZXRlcmAgZm9yIGRvY3VtZW50YXRpb24gb25cbiAqIGhvdyB2YWx1ZXMgYXJlIGNvbnZlcnRlZCBiZXR3ZWVuIFNRTFxuICogYW5kIEphdmFTY3JpcHQgdHlwZXMuXG4gKi9cbmV4cG9ydCB0eXBlIFF1ZXJ5UGFyYW1ldGVyU2V0ID1cbiAgfCBSZWNvcmQ8c3RyaW5nLCBRdWVyeVBhcmFtZXRlcj5cbiAgfCBBcnJheTxRdWVyeVBhcmFtZXRlcj47XG5cbi8qKlxuICogTmFtZSBvZiBhIGNvbHVtbiByZXR1cm5lZCBmcm9tIGEgZGF0YWJhc2UgcXVlcnkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29sdW1uTmFtZSB7XG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSByZXR1cm5lZCBjb2x1bW4uXG4gICAqXG4gICAqIENvcnJlc3BvbmRzIHRvIHRoZSBgc3FsaXRlM19jb2x1bW5fbmFtZWBcbiAgICogZnVuY3Rpb24uXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSBkYXRhYmFzZSBjb2x1bW4gdGhhdCBzdG9yZXNcbiAgICogdGhlIGRhdGEgcmV0dXJuZWQgZnJvbSB0aGlzIHF1ZXJ5LlxuICAgKlxuICAgKiBUaGlzIG1pZ2h0IGJlIGRpZmZlcmVudCBmcm9tIGBuYW1lYCBpZiBhXG4gICAqIGNvbHVtbnMgd2FzIHJlbmFtZWQgdXNpbmcgZS5nLiBhcyBpblxuICAgKiBgU0VMRUNUIGZvbyBBUyBiYXIgRlJPTSB0YWJsZWAuXG4gICAqXG4gICAqIENvcnJlc3BvbmRzIHRvIHRoZSBgc3FsaXRlM19jb2x1bW5fb3JpZ2luX25hbWVgXG4gICAqIGZ1bmN0aW9uLlxuICAgKi9cbiAgb3JpZ2luTmFtZTogc3RyaW5nO1xuICAvKipcbiAgICogTmFtZSBvZiB0aGUgdGFibGUgdGhhdCBzdG9yZXMgdGhlIGRhdGFcbiAgICogcmV0dXJuZWQgZnJvbSB0aGlzIHF1ZXJ5LlxuICAgKlxuICAgKiBDb3JyZXNwb25kcyB0byB0aGUgYHNxbGl0ZTNfY29sdW1uX3RhYmxlX25hbWVgXG4gICAqIGZ1bmN0aW9uLlxuICAgKi9cbiAgdGFibGVOYW1lOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBSb3dzSXRlcmF0b3I8Uj4ge1xuICBuZXh0OiAoKSA9PiBJdGVyYXRvclJlc3VsdDxSPjtcbiAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IFJvd3NJdGVyYXRvcjxSPjtcbn1cblxuLyoqXG4gKiBBIHByZXBhcmVkIHF1ZXJ5IHdoaWNoIGNhbiBiZSBleGVjdXRlZCBtYW55XG4gKiB0aW1lcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFByZXBhcmVkUXVlcnk8XG4gIFIgZXh0ZW5kcyBSb3cgPSBSb3csXG4gIE8gZXh0ZW5kcyBSb3dPYmplY3QgPSBSb3dPYmplY3QsXG4gIFAgZXh0ZW5kcyBRdWVyeVBhcmFtZXRlclNldCA9IFF1ZXJ5UGFyYW1ldGVyU2V0LFxuPiB7XG4gICN3YXNtOiBXYXNtO1xuICAjc3RtdDogU3RhdGVtZW50UHRyO1xuICAjb3BlblN0YXRlbWVudHM6IFNldDxTdGF0ZW1lbnRQdHI+O1xuXG4gICNzdGF0dXM6IG51bWJlcjtcbiAgI2l0ZXJLdjogYm9vbGVhbjtcbiAgI3Jvd0tleXM/OiBBcnJheTxzdHJpbmc+O1xuICAjZmluYWxpemVkOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGlzIGNvbnN0cnVjdG9yIHNob3VsZCBuZXZlciBiZSB1c2VkIGRpcmVjdGx5LlxuICAgKiBJbnN0ZWFkIGEgcHJlcGFyZWQgcXVlcnkgY2FuIGJlIG9idGFpbmVkIGJ5XG4gICAqIGNhbGxpbmcgYERCLnByZXBhcmVRdWVyeWAuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICB3YXNtOiBXYXNtLFxuICAgIHN0bXQ6IFN0YXRlbWVudFB0cixcbiAgICBvcGVuU3RhdGVtZW50czogU2V0PFN0YXRlbWVudFB0cj4sXG4gICkge1xuICAgIHRoaXMuI3dhc20gPSB3YXNtO1xuICAgIHRoaXMuI3N0bXQgPSBzdG10O1xuICAgIHRoaXMuI29wZW5TdGF0ZW1lbnRzID0gb3BlblN0YXRlbWVudHM7XG5cbiAgICB0aGlzLiNzdGF0dXMgPSBTdGF0dXMuVW5rbm93bjtcbiAgICB0aGlzLiNpdGVyS3YgPSBmYWxzZTtcbiAgICB0aGlzLiNmaW5hbGl6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gICNzdGFydFF1ZXJ5KHBhcmFtcz86IFApIHtcbiAgICBpZiAodGhpcy4jZmluYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoXCJRdWVyeSBpcyBmaW5hbGl6ZWQuXCIpO1xuICAgIH1cblxuICAgIC8vIFJlc2V0IHF1ZXJ5XG4gICAgdGhpcy4jd2FzbS5yZXNldCh0aGlzLiNzdG10KTtcbiAgICB0aGlzLiN3YXNtLmNsZWFyX2JpbmRpbmdzKHRoaXMuI3N0bXQpO1xuXG4gICAgLy8gUHJlcGFyZSBwYXJhbWV0ZXIgYXJyYXlcbiAgICBsZXQgcGFyYW1ldGVycyA9IFtdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHBhcmFtcykpIHtcbiAgICAgIHBhcmFtZXRlcnMgPSBwYXJhbXM7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW1zID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAvLyBSZXNvbHZlIHBhcmFtZXRlciBpbmRleCBmb3IgbmFtZWQgcGFyYW1ldGVyXG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhwYXJhbXMpKSB7XG4gICAgICAgIGxldCBuYW1lID0ga2V5O1xuICAgICAgICAvLyBibGFuayBuYW1lcyBkZWZhdWx0IHRvICc6J1xuICAgICAgICBpZiAobmFtZVswXSAhPT0gXCI6XCIgJiYgbmFtZVswXSAhPT0gXCJAXCIgJiYgbmFtZVswXSAhPT0gXCIkXCIpIHtcbiAgICAgICAgICBuYW1lID0gYDoke25hbWV9YDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpZHggPSBzZXRTdHIoXG4gICAgICAgICAgdGhpcy4jd2FzbSxcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgIChwdHIpID0+IHRoaXMuI3dhc20uYmluZF9wYXJhbWV0ZXJfaW5kZXgodGhpcy4jc3RtdCwgcHRyKSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGlkeCA9PT0gVmFsdWVzLkVycm9yKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKGBObyBwYXJhbWV0ZXIgbmFtZWQgJyR7bmFtZX0nLmApO1xuICAgICAgICB9XG4gICAgICAgIHBhcmFtZXRlcnNbaWR4IC0gMV0gPSBwYXJhbXNba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCaW5kIHBhcmFtZXRlcnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFtZXRlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCB2YWx1ZSA9IHBhcmFtZXRlcnNbaV07XG4gICAgICBsZXQgc3RhdHVzO1xuICAgICAgc3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgY2FzZSBcImJvb2xlYW5cIjpcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlID8gMSA6IDA7XG4gICAgICAgICAgLy8gZmFsbCB0aHJvdWdoXG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgICBpZiAoTnVtYmVyLmlzU2FmZUludGVnZXIodmFsdWUpKSB7XG4gICAgICAgICAgICBzdGF0dXMgPSB0aGlzLiN3YXNtLmJpbmRfaW50KHRoaXMuI3N0bXQsIGkgKyAxLCB2YWx1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IHRoaXMuI3dhc20uYmluZF9kb3VibGUodGhpcy4jc3RtdCwgaSArIDEsIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJiaWdpbnRcIjpcbiAgICAgICAgICAvLyBiaWdpbnQgaXMgYm91bmQgYXMgdHdvIDMyYml0IGludGVnZXJzIGFuZCByZWFzc2VtYmxlZCBvbiB0aGUgQyBzaWRlXG4gICAgICAgICAgaWYgKHZhbHVlID4gOTIyMzM3MjAzNjg1NDc3NTgwN24gfHwgdmFsdWUgPCAtOTIyMzM3MjAzNjg1NDc3NTgwOG4pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcihcbiAgICAgICAgICAgICAgYEJpZ0ludCB2YWx1ZSAke3ZhbHVlfSBvdmVyZmxvd3MgNjQgYml0IGludGVnZXIuYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHBvc1ZhbCA9IHZhbHVlID49IDBuID8gdmFsdWUgOiAtdmFsdWU7XG4gICAgICAgICAgICBjb25zdCBzaWduID0gdmFsdWUgPj0gMG4gPyAxIDogLTE7XG4gICAgICAgICAgICBjb25zdCB1cHBlciA9IE51bWJlcihCaWdJbnQuYXNVaW50TigzMiwgcG9zVmFsID4+IDMybikpO1xuICAgICAgICAgICAgY29uc3QgbG93ZXIgPSBOdW1iZXIoQmlnSW50LmFzVWludE4oMzIsIHBvc1ZhbCkpO1xuICAgICAgICAgICAgc3RhdHVzID0gdGhpcy4jd2FzbS5iaW5kX2JpZ19pbnQoXG4gICAgICAgICAgICAgIHRoaXMuI3N0bXQsXG4gICAgICAgICAgICAgIGkgKyAxLFxuICAgICAgICAgICAgICBzaWduLFxuICAgICAgICAgICAgICB1cHBlcixcbiAgICAgICAgICAgICAgbG93ZXIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICAgIHN0YXR1cyA9IHNldFN0cihcbiAgICAgICAgICAgIHRoaXMuI3dhc20sXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIChwdHIpID0+IHRoaXMuI3dhc20uYmluZF90ZXh0KHRoaXMuI3N0bXQsIGkgKyAxLCBwdHIpLFxuICAgICAgICAgICk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgLy8gRGF0ZXMgYXJlIGFsbG93ZWQgYW5kIGJvdW5kIHRvIFRFWFQsIGZvcm1hdHRlZCBgWVlZWS1NTS1ERFRISDpNTTpTUy5TU1NaYFxuICAgICAgICAgICAgc3RhdHVzID0gc2V0U3RyKFxuICAgICAgICAgICAgICB0aGlzLiN3YXNtLFxuICAgICAgICAgICAgICB2YWx1ZS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAocHRyKSA9PiB0aGlzLiN3YXNtLmJpbmRfdGV4dCh0aGlzLiNzdG10LCBpICsgMSwgcHRyKSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgICAgIC8vIFVpbnQ4QXJyYXlzIGFyZSBhbGxvd2VkIGFuZCBib3VuZCB0byBCTE9CXG4gICAgICAgICAgICBjb25zdCBzaXplID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgc3RhdHVzID0gc2V0QXJyKFxuICAgICAgICAgICAgICB0aGlzLiN3YXNtLFxuICAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICAgKHB0cikgPT4gdGhpcy4jd2FzbS5iaW5kX2Jsb2IodGhpcy4jc3RtdCwgaSArIDEsIHB0ciwgc2l6ZSksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gQm90aCBudWxsIGFuZCB1bmRlZmluZWQgcmVzdWx0IGluIGEgTlVMTCBlbnRyeVxuICAgICAgICAgICAgc3RhdHVzID0gdGhpcy4jd2FzbS5iaW5kX251bGwodGhpcy4jc3RtdCwgaSArIDEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoYENhbiBub3QgYmluZCAke3R5cGVvZiB2YWx1ZX0uYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKHN0YXR1cyAhPT0gU3RhdHVzLlNxbGl0ZU9rKSB7XG4gICAgICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcih0aGlzLiN3YXNtLCBzdGF0dXMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gICNnZXRRdWVyeVJvdygpOiBSIHtcbiAgICBpZiAodGhpcy4jZmluYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoXCJRdWVyeSBpcyBmaW5hbGl6ZWQuXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbHVtbkNvdW50ID0gdGhpcy4jd2FzbS5jb2x1bW5fY291bnQodGhpcy4jc3RtdCk7XG4gICAgY29uc3Qgcm93OiBSb3cgPSBuZXcgQXJyYXkoY29sdW1uQ291bnQpO1xuICAgIGZvciAobGV0IGNvbHVtbklkeCA9IDA7IGNvbHVtbklkeCA8IGNvbHVtbkNvdW50OyBjb2x1bW5JZHgrKykge1xuICAgICAgc3dpdGNoICh0aGlzLiN3YXNtLmNvbHVtbl90eXBlKHRoaXMuI3N0bXQsIGNvbHVtbklkeCkpIHtcbiAgICAgICAgY2FzZSBUeXBlcy5JbnRlZ2VyOlxuICAgICAgICAgIHJvd1tjb2x1bW5JZHhdID0gdGhpcy4jd2FzbS5jb2x1bW5faW50KHRoaXMuI3N0bXQsIGNvbHVtbklkeCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgVHlwZXMuRmxvYXQ6XG4gICAgICAgICAgcm93W2NvbHVtbklkeF0gPSB0aGlzLiN3YXNtLmNvbHVtbl9kb3VibGUodGhpcy4jc3RtdCwgY29sdW1uSWR4KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBUeXBlcy5UZXh0OlxuICAgICAgICAgIHJvd1tjb2x1bW5JZHhdID0gZ2V0U3RyKFxuICAgICAgICAgICAgdGhpcy4jd2FzbSxcbiAgICAgICAgICAgIHRoaXMuI3dhc20uY29sdW1uX3RleHQodGhpcy4jc3RtdCwgY29sdW1uSWR4KSxcbiAgICAgICAgICApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFR5cGVzLkJsb2I6IHtcbiAgICAgICAgICBjb25zdCBwdHIgPSB0aGlzLiN3YXNtLmNvbHVtbl9ibG9iKHRoaXMuI3N0bXQsIGNvbHVtbklkeCk7XG4gICAgICAgICAgaWYgKHB0ciA9PT0gMCkge1xuICAgICAgICAgICAgLy8gWmVybyBwb2ludGVyIHJlc3VsdHMgaW4gbnVsbFxuICAgICAgICAgICAgcm93W2NvbHVtbklkeF0gPSBudWxsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBsZW5ndGggPSB0aGlzLiN3YXNtLmNvbHVtbl9ieXRlcyh0aGlzLiNzdG10LCBjb2x1bW5JZHgpO1xuICAgICAgICAgICAgLy8gU2xpY2Ugc2hvdWxkIGNvcHkgdGhlIGJ5dGVzLCBhcyBpdCBtYWtlcyBhIHNoYWxsb3cgY29weVxuICAgICAgICAgICAgcm93W2NvbHVtbklkeF0gPSBuZXcgVWludDhBcnJheShcbiAgICAgICAgICAgICAgdGhpcy4jd2FzbS5tZW1vcnkuYnVmZmVyLFxuICAgICAgICAgICAgICBwdHIsXG4gICAgICAgICAgICAgIGxlbmd0aCxcbiAgICAgICAgICAgICkuc2xpY2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlcy5CaWdJbnRlZ2VyOiB7XG4gICAgICAgICAgY29uc3QgcHRyID0gdGhpcy4jd2FzbS5jb2x1bW5fdGV4dCh0aGlzLiNzdG10LCBjb2x1bW5JZHgpO1xuICAgICAgICAgIHJvd1tjb2x1bW5JZHhdID0gQmlnSW50KGdldFN0cih0aGlzLiN3YXNtLCBwdHIpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIC8vIFRPRE8oZHllZGdyZWVuKTogRGlmZmVyZW50aWF0ZSBiZXR3ZWVuIE5VTEwgYW5kIG5vdC1yZWNvZ25pemVkP1xuICAgICAgICAgIHJvd1tjb2x1bW5JZHhdID0gbnVsbDtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJvdyBhcyBSO1xuICB9XG5cbiAgI21ha2VSb3dPYmplY3Qocm93OiBSb3cpOiBPIHtcbiAgICBpZiAodGhpcy4jcm93S2V5cyA9PSBudWxsKSB7XG4gICAgICBjb25zdCByb3dDb3VudCA9IHRoaXMuI3dhc20uY29sdW1uX2NvdW50KHRoaXMuI3N0bXQpO1xuICAgICAgdGhpcy4jcm93S2V5cyA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICAgIHRoaXMuI3Jvd0tleXMucHVzaChcbiAgICAgICAgICBnZXRTdHIodGhpcy4jd2FzbSwgdGhpcy4jd2FzbS5jb2x1bW5fbmFtZSh0aGlzLiNzdG10LCBpKSksXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgb2JqID0gcm93LnJlZHVjZTxSb3dPYmplY3Q+KChvYmosIHZhbCwgaWR4KSA9PiB7XG4gICAgICBvYmpbdGhpcy4jcm93S2V5cyFbaWR4XV0gPSB2YWw7XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sIHt9KTtcbiAgICByZXR1cm4gb2JqIGFzIE87XG4gIH1cblxuICAvKipcbiAgICogQmluZHMgdGhlIGdpdmVuIHBhcmFtZXRlcnMgdG8gdGhlIHF1ZXJ5XG4gICAqIGFuZCByZXR1cm5zIGFuIGl0ZXJhdG9yIG92ZXIgcm93cy5cbiAgICpcbiAgICogVXNpbmcgYW4gaXRlcmF0b3IgYXZvaWRzIGxvYWRpbmcgYWxsIHJldHVybmVkXG4gICAqIHJvd3MgaW50byBtZW1vcnkgYW5kIGhlbmNlIGFsbG93cyB0byBwcm9jZXNzIGEgbGFyZ2VcbiAgICogbnVtYmVyIG9mIHJvd3MuXG4gICAqXG4gICAqIENhbGxpbmcgYGl0ZXJgLCBgYWxsYCwgb3IgYGZpcnN0YCBpbnZhbGlkYXRlcyBhbnkgaXRlcmF0b3JzXG4gICAqIHByZXZpb3VzbHkgcmV0dXJuZWQgZnJvbSB0aGlzIHByZXBhcmVkIHF1ZXJ5LlxuICAgKlxuICAgKiAjIEV4YW1wbGVzXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3QgcXVlcnkgPSBkYi5wcmVwYXJlUXVlcnk8W251bWJlciwgc3RyaW5nXT4oXCJTRUxFQ1QgaWQsIG5hbWUgRlJPTSBwZW9wbGVcIik7XG4gICAqIGZvciAoY29uc3QgW2lkLCBuYW1lXSBvZiBxdWVyeS5pdGVyKCkpIHtcbiAgICogICAvLyAuLi5cbiAgICogfVxuICAgKiBgYGBcbiAgICpcbiAgICogVG8gYXZvaWQgU1FMIGluamVjdGlvbiwgdXNlci1wcm92aWRlZCB2YWx1ZXNcbiAgICogc2hvdWxkIGFsd2F5cyBiZSBwYXNzZWQgdG8gdGhlIGRhdGFiYXNlIHRocm91Z2hcbiAgICogYSBxdWVyeSBwYXJhbWV0ZXIuXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3QgcXVlcnkgPSBkYi5wcmVwYXJlUXVlcnkoXCJTRUxFQ1QgaWQgRlJPTSBwZW9wbGUgV0hFUkUgbmFtZSA9ID9cIik7XG4gICAqIHF1ZXJ5Lml0ZXIoW25hbWVdKTtcbiAgICogYGBgXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3QgcXVlcnkgPSBkYi5wcmVwYXJlUXVlcnkoXCJTRUxFQ1QgaWQgRlJPTSBwZW9wbGUgV0hFUkUgbmFtZSA9IDpuYW1lXCIpO1xuICAgKiBxdWVyeS5pdGVyKHsgbmFtZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIFNlZSBgUXVlcnlQYXJhbWV0ZXJTZXRgIGZvciBkb2N1bWVudGF0aW9uIG9uXG4gICAqIGhvdyB2YWx1ZXMgY2FuIGJlIGJvdW5kIHRvIFNRTCBzdGF0ZW1lbnRzLlxuICAgKlxuICAgKiBTZWUgYFF1ZXJ5UGFyYW1ldGVyYCBmb3IgZG9jdW1lbnRhdGlvbiBvbiBob3dcbiAgICogdmFsdWVzIGFyZSByZXR1cm5lZCBmcm9tIHRoZSBkYXRhYmFzZS5cbiAgICovXG4gIGl0ZXIocGFyYW1zPzogUCk6IFJvd3NJdGVyYXRvcjxSPiB7XG4gICAgdGhpcy4jc3RhcnRRdWVyeShwYXJhbXMpO1xuICAgIHRoaXMuI3N0YXR1cyA9IHRoaXMuI3dhc20uc3RlcCh0aGlzLiNzdG10KTtcbiAgICBpZiAoXG4gICAgICB0aGlzLiNzdGF0dXMgIT09IFN0YXR1cy5TcWxpdGVSb3cgJiYgdGhpcy4jc3RhdHVzICE9PSBTdGF0dXMuU3FsaXRlRG9uZVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKHRoaXMuI3dhc20sIHRoaXMuI3N0YXR1cyk7XG4gICAgfVxuICAgIHRoaXMuI2l0ZXJLdiA9IGZhbHNlO1xuICAgIHJldHVybiB0aGlzIGFzIFJvd3NJdGVyYXRvcjxSPjtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaWtlIGBpdGVyYCBleGNlcHQgZWFjaCByb3cgaXMgcmV0dXJuZWRcbiAgICogYXMgYW4gb2JqZWN0IGNvbnRhaW5pbmcga2V5LXZhbHVlIHBhaXJzLlxuICAgKlxuICAgKiAjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBxdWVyeSA9IGRiLnByZXBhcmVRdWVyeTxbbnVtYmVyLCBzdHJpbmddLCB7IGlkOiBudW1iZXIsIG5hbWU6IHN0cmluZyB9PihcIlNFTEVDVCBpZCwgbmFtZSBGUk9NIHBlb3BsZVwiKTtcbiAgICogZm9yIChjb25zdCB7IGlkLCBuYW1lIH0gb2YgcXVlcnkuaXRlckVudHJpZXMoKSkge1xuICAgKiAgIC8vIC4uLlxuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgaXRlckVudHJpZXMocGFyYW1zPzogUCk6IFJvd3NJdGVyYXRvcjxPPiB7XG4gICAgdGhpcy5pdGVyKHBhcmFtcyk7XG4gICAgdGhpcy4jaXRlckt2ID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcyBhcyBSb3dzSXRlcmF0b3I8Tz47XG4gIH1cblxuICAvKipcbiAgICogQGlnbm9yZVxuICAgKlxuICAgKiBJbXBsZW1lbnRzIHRoZSBpdGVyYWJsZSBwcm90b2NvbC4gSXQgaXNcbiAgICogYSBidWcgdG8gY2FsbCB0aGlzIG1ldGhvZCBkaXJlY3RseS5cbiAgICovXG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IFJvd3NJdGVyYXRvcjxSIHwgTz4ge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBpZ25vcmVcbiAgICpcbiAgICogSW1wbGVtZW50cyB0aGUgaXRlcmF0b3IgcHJvdG9jb2wuIEl0IGlzXG4gICAqIGEgYnVnIHRvIGNhbGwgdGhpcyBtZXRob2QgZGlyZWN0bHkuXG4gICAqL1xuICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFIgfCBPPiB7XG4gICAgaWYgKHRoaXMuI3N0YXR1cyA9PT0gU3RhdHVzLlNxbGl0ZVJvdykge1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLiNnZXRRdWVyeVJvdygpO1xuICAgICAgdGhpcy4jc3RhdHVzID0gdGhpcy4jd2FzbS5zdGVwKHRoaXMuI3N0bXQpO1xuICAgICAgaWYgKHRoaXMuI2l0ZXJLdikge1xuICAgICAgICByZXR1cm4geyB2YWx1ZTogdGhpcy4jbWFrZVJvd09iamVjdCh2YWx1ZSksIGRvbmU6IGZhbHNlIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4geyB2YWx1ZSwgZG9uZTogZmFsc2UgfTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuI3N0YXR1cyA9PT0gU3RhdHVzLlNxbGl0ZURvbmUpIHtcbiAgICAgIHJldHVybiB7IHZhbHVlOiBudWxsLCBkb25lOiB0cnVlIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcih0aGlzLiN3YXNtLCB0aGlzLiNzdGF0dXMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCaW5kcyB0aGUgZ2l2ZW4gcGFyYW1ldGVycyB0byB0aGUgcXVlcnlcbiAgICogYW5kIHJldHVybnMgYW4gYXJyYXkgY29udGFpbmluZyBhbGwgcmVzdWx0aW5nXG4gICAqIHJvd3MuXG4gICAqXG4gICAqICMgRXhhbXBsZXNcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBxdWVyeSA9IGRiLnByZXBhcmVRdWVyeTxbbnVtYmVyLCBzdHJpbmddPihcIlNFTEVDVCBpZCwgbmFtZSBGUk9NIHBlb3BsZVwiKTtcbiAgICogY29uc3Qgcm93cyA9IHF1ZXJ5LmFsbCgpO1xuICAgKiAvLyByb3dzID0gW1sxLCBcIlBldGVyXCJdLCAuLi5dXG4gICAqIGBgYFxuICAgKlxuICAgKiBUbyBhdm9pZCBTUUwgaW5qZWN0aW9uLCB1c2VyLXByb3ZpZGVkIHZhbHVlc1xuICAgKiBzaG91bGQgYWx3YXlzIGJlIHBhc3NlZCB0byB0aGUgZGF0YWJhc2UgdGhyb3VnaFxuICAgKiBhIHF1ZXJ5IHBhcmFtZXRlci5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBxdWVyeSA9IGRiLnByZXBhcmVRdWVyeShcIlNFTEVDVCBpZCBGUk9NIHBlb3BsZSBXSEVSRSBuYW1lID0gP1wiKTtcbiAgICogcXVlcnkuYWxsKFtuYW1lXSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHF1ZXJ5ID0gZGIucHJlcGFyZVF1ZXJ5KFwiU0VMRUNUIGlkIEZST00gcGVvcGxlIFdIRVJFIG5hbWUgPSA6bmFtZVwiKTtcbiAgICogcXVlcnkuYWxsKHsgbmFtZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIFNlZSBgUXVlcnlQYXJhbWV0ZXJTZXRgIGZvciBkb2N1bWVudGF0aW9uIG9uXG4gICAqIGhvdyB2YWx1ZXMgY2FuIGJlIGJvdW5kIHRvIFNRTCBzdGF0ZW1lbnRzLlxuICAgKlxuICAgKiBTZWUgYFF1ZXJ5UGFyYW1ldGVyYCBmb3IgZG9jdW1lbnRhdGlvbiBvbiBob3dcbiAgICogdmFsdWVzIGFyZSByZXR1cm5lZCBmcm9tIHRoZSBkYXRhYmFzZS5cbiAgICovXG4gIGFsbChwYXJhbXM/OiBQKTogQXJyYXk8Uj4ge1xuICAgIHRoaXMuI3N0YXJ0UXVlcnkocGFyYW1zKTtcbiAgICBjb25zdCByb3dzOiBBcnJheTxSPiA9IFtdO1xuICAgIHRoaXMuI3N0YXR1cyA9IHRoaXMuI3dhc20uc3RlcCh0aGlzLiNzdG10KTtcbiAgICB3aGlsZSAodGhpcy4jc3RhdHVzID09PSBTdGF0dXMuU3FsaXRlUm93KSB7XG4gICAgICByb3dzLnB1c2godGhpcy4jZ2V0UXVlcnlSb3coKSk7XG4gICAgICB0aGlzLiNzdGF0dXMgPSB0aGlzLiN3YXNtLnN0ZXAodGhpcy4jc3RtdCk7XG4gICAgfVxuICAgIGlmICh0aGlzLiNzdGF0dXMgIT09IFN0YXR1cy5TcWxpdGVEb25lKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IodGhpcy4jd2FzbSwgdGhpcy4jc3RhdHVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJvd3M7XG4gIH1cblxuICAvKipcbiAgICogTGlrZSBgYWxsYCBleGNlcHQgZWFjaCByb3cgaXMgcmV0dXJuZWRcbiAgICogYXMgYW4gb2JqZWN0IGNvbnRhaW5pbmcga2V5LXZhbHVlIHBhaXJzLlxuICAgKlxuICAgKiAjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBxdWVyeSA9IGRiLnByZXBhcmVRdWVyeTxbbnVtYmVyLCBzdHJpbmddLCB7IGlkOiBudW1iZXIsIG5hbWU6IHN0cmluZyB9PihcIlNFTEVDVCBpZCwgbmFtZSBGUk9NIHBlb3BsZVwiKTtcbiAgICogY29uc3Qgcm93cyA9IHF1ZXJ5LmFsbEVudHJpZXMoKTtcbiAgICogLy8gcm93cyA9IFt7IGlkOiAxLCBuYW1lOiBcIlBldGVyXCIgfSwgLi4uXVxuICAgKiBgYGBcbiAgICovXG4gIGFsbEVudHJpZXMocGFyYW1zPzogUCk6IEFycmF5PE8+IHtcbiAgICByZXR1cm4gdGhpcy5hbGwocGFyYW1zKS5tYXAoKHJvdykgPT4gdGhpcy4jbWFrZVJvd09iamVjdChyb3cpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCaW5kcyB0aGUgZ2l2ZW4gcGFyYW1ldGVycyB0byB0aGUgcXVlcnlcbiAgICogYW5kIHJldHVybnMgdGhlIGZpcnN0IHJlc3VsdGluZyByb3cgb3JcbiAgICogYHVuZGVmaW5lZGAgd2hlbiB0aGVyZSBhcmUgbm8gcm93cyByZXR1cm5lZFxuICAgKiBieSB0aGUgcXVlcnkuXG4gICAqXG4gICAqICMgRXhhbXBsZXNcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBxdWVyeSA9IGRiLnByZXBhcmVRdWVyeTxbbnVtYmVyLCBzdHJpbmddPihcIlNFTEVDVCBpZCwgbmFtZSBGUk9NIHBlb3BsZVwiKTtcbiAgICogY29uc3QgcGVyc29uID0gcXVlcnkuZmlyc3QoKTtcbiAgICogLy8gcGVyc29uID0gWzEsIFwiUGV0ZXJcIl1cbiAgICogYGBgXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3QgcXVlcnkgPSBkYi5wcmVwYXJlUXVlcnkoXCJTRUxFQ1QgaWQsIG5hbWUgRlJPTSBwZW9wbGUgV0hFUkUgbmFtZSA9ID9cIik7XG4gICAqIGNvbnN0IHBlcnNvbiA9IHF1ZXJ5LmZpcnN0KFtcIm5vdCBhIG5hbWVcIl0pO1xuICAgKiAvLyBwZXJzb24gPSB1bmRlZmluZWRcbiAgICogYGBgXG4gICAqXG4gICAqIFRvIGF2b2lkIFNRTCBpbmplY3Rpb24sIHVzZXItcHJvdmlkZWQgdmFsdWVzXG4gICAqIHNob3VsZCBhbHdheXMgYmUgcGFzc2VkIHRvIHRoZSBkYXRhYmFzZSB0aHJvdWdoXG4gICAqIGEgcXVlcnkgcGFyYW1ldGVyLlxuICAgKlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHF1ZXJ5ID0gZGIucHJlcGFyZVF1ZXJ5KFwiU0VMRUNUIGlkIEZST00gcGVvcGxlIFdIRVJFIG5hbWUgPSA/XCIpO1xuICAgKiBxdWVyeS5maXJzdChbbmFtZV0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBxdWVyeSA9IGRiLnByZXBhcmVRdWVyeShcIlNFTEVDVCBpZCBGUk9NIHBlb3BsZSBXSEVSRSBuYW1lID0gOm5hbWVcIik7XG4gICAqIHF1ZXJ5LmZpcnN0KHsgbmFtZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIFNlZSBgUXVlcnlQYXJhbWV0ZXJTZXRgIGZvciBkb2N1bWVudGF0aW9uIG9uXG4gICAqIGhvdyB2YWx1ZXMgY2FuIGJlIGJvdW5kIHRvIFNRTCBzdGF0ZW1lbnRzLlxuICAgKlxuICAgKiBTZWUgYFF1ZXJ5UGFyYW1ldGVyYCBmb3IgZG9jdW1lbnRhdGlvbiBvbiBob3dcbiAgICogdmFsdWVzIGFyZSByZXR1cm5lZCBmcm9tIHRoZSBkYXRhYmFzZS5cbiAgICovXG4gIGZpcnN0KHBhcmFtcz86IFApOiBSIHwgdW5kZWZpbmVkIHtcbiAgICB0aGlzLiNzdGFydFF1ZXJ5KHBhcmFtcyk7XG5cbiAgICB0aGlzLiNzdGF0dXMgPSB0aGlzLiN3YXNtLnN0ZXAodGhpcy4jc3RtdCk7XG4gICAgbGV0IHJvdyA9IHVuZGVmaW5lZDtcbiAgICBpZiAodGhpcy4jc3RhdHVzID09PSBTdGF0dXMuU3FsaXRlUm93KSB7XG4gICAgICByb3cgPSB0aGlzLiNnZXRRdWVyeVJvdygpO1xuICAgIH1cblxuICAgIHdoaWxlICh0aGlzLiNzdGF0dXMgPT09IFN0YXR1cy5TcWxpdGVSb3cpIHtcbiAgICAgIHRoaXMuI3N0YXR1cyA9IHRoaXMuI3dhc20uc3RlcCh0aGlzLiNzdG10KTtcbiAgICB9XG4gICAgaWYgKHRoaXMuI3N0YXR1cyAhPT0gU3RhdHVzLlNxbGl0ZURvbmUpIHtcbiAgICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcih0aGlzLiN3YXNtLCB0aGlzLiNzdGF0dXMpO1xuICAgIH1cblxuICAgIHJldHVybiByb3c7XG4gIH1cblxuICAvKipcbiAgICogTGlrZSBgZmlyc3RgIGV4Y2VwdCB0aGUgcm93IGlzIHJldHVybmVkXG4gICAqIGFzIGFuIG9iamVjdCBjb250YWluaW5nIGtleS12YWx1ZSBwYWlycy5cbiAgICpcbiAgICogIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3QgcXVlcnkgPSBkYi5wcmVwYXJlUXVlcnk8W251bWJlciwgc3RyaW5nXSwgeyBpZDogbnVtYmVyLCBuYW1lOiBzdHJpbmcgfT4oXCJTRUxFQ1QgaWQsIG5hbWUgRlJPTSBwZW9wbGVcIik7XG4gICAqIGNvbnN0IHBlcnNvbiA9IHF1ZXJ5LmZpcnN0RW50cnkoKTtcbiAgICogLy8gcGVyc29uID0geyBpZDogMSwgbmFtZTogXCJQZXRlclwiIH1cbiAgICogYGBgXG4gICAqL1xuICBmaXJzdEVudHJ5KHBhcmFtcz86IFApOiBPIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCByb3cgPSB0aGlzLmZpcnN0KHBhcmFtcyk7XG4gICAgcmV0dXJuIHJvdyA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogdGhpcy4jbWFrZVJvd09iamVjdChyb3cpO1xuICB9XG5cbiAgLyoqXG4gICAqICoqRGVwcmVjYXRlZDoqKiBwcmVmZXIgYGZpcnN0YC5cbiAgICovXG4gIG9uZShwYXJhbXM/OiBQKTogUiB7XG4gICAgY29uc3Qgcm93cyA9IHRoaXMuYWxsKHBhcmFtcyk7XG5cbiAgICBpZiAocm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcihcIlRoZSBxdWVyeSBkaWQgbm90IHJldHVybiBhbnkgcm93cy5cIik7XG4gICAgfSBlbHNlIGlmIChyb3dzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcihcIlRoZSBxdWVyeSByZXR1cm5lZCBtb3JlIHRoYW4gb25lIHJvdy5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiByb3dzWzBdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiAqKkRlcHJlY2F0ZWQ6KiogcHJlZmVyIGBmaXJzdEVudHJ5YC5cbiAgICovXG4gIG9uZUVudHJ5KHBhcmFtcz86IFApOiBPIHtcbiAgICByZXR1cm4gdGhpcy4jbWFrZVJvd09iamVjdCh0aGlzLm9uZShwYXJhbXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCaW5kcyB0aGUgZ2l2ZW4gcGFyYW1ldGVycyB0byB0aGUgcXVlcnkgYW5kXG4gICAqIGV4ZWN1dGVzIHRoZSBxdWVyeSwgaWdub3JpbmcgYW55IHJvd3Mgd2hpY2hcbiAgICogbWlnaHQgYmUgcmV0dXJuZWQuXG4gICAqXG4gICAqIFVzaW5nIHRoaXMgbWV0aG9kIGlzIG1vcmUgZWZmaWNpZW50IHdoZW4gdGhlXG4gICAqIHJvd3MgcmV0dXJuZWQgYnkgYSBxdWVyeSBhcmUgbm90IG5lZWRlZCBvclxuICAgKiB0aGUgcXVlcnkgZG9lcyBub3QgcmV0dXJuIGFueSByb3dzLlxuICAgKlxuICAgKiAjIEV4YW1wbGVzXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3QgcXVlcnkgPSBkYi5wcmVwYXJlUXVlcnk8bmV2ZXIsIG5ldmVyLCBbc3RyaW5nXT4oXCJJTlNFUlQgSU5UTyBwZW9wbGUgKG5hbWUpIFZBTFVFUyAoPylcIik7XG4gICAqIHF1ZXJ5LmV4ZWN1dGUoW1wiUGV0ZXJcIl0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBxdWVyeSA9IGRiLnByZXBhcmVRdWVyeTxuZXZlciwgbmV2ZXIsIHsgbmFtZTogc3RyaW5nIH0+KFwiSU5TRVJUIElOVE8gcGVvcGxlIChuYW1lKSBWQUxVRVMgKDpuYW1lKVwiKTtcbiAgICogcXVlcnkuZXhlY3V0ZSh7IG5hbWU6IFwiUGV0ZXJcIiB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIFNlZSBgUXVlcnlQYXJhbWV0ZXJTZXRgIGZvciBkb2N1bWVudGF0aW9uIG9uXG4gICAqIGhvdyB2YWx1ZXMgY2FuIGJlIGJvdW5kIHRvIFNRTCBzdGF0ZW1lbnRzLlxuICAgKlxuICAgKiBTZWUgYFF1ZXJ5UGFyYW1ldGVyYCBmb3IgZG9jdW1lbnRhdGlvbiBvbiBob3dcbiAgICogdmFsdWVzIGFyZSByZXR1cm5lZCBmcm9tIHRoZSBkYXRhYmFzZS5cbiAgICovXG4gIGV4ZWN1dGUocGFyYW1zPzogUCkge1xuICAgIHRoaXMuI3N0YXJ0UXVlcnkocGFyYW1zKTtcbiAgICB0aGlzLiNzdGF0dXMgPSB0aGlzLiN3YXNtLnN0ZXAodGhpcy4jc3RtdCk7XG4gICAgd2hpbGUgKHRoaXMuI3N0YXR1cyA9PT0gU3RhdHVzLlNxbGl0ZVJvdykge1xuICAgICAgdGhpcy4jc3RhdHVzID0gdGhpcy4jd2FzbS5zdGVwKHRoaXMuI3N0bXQpO1xuICAgIH1cbiAgICBpZiAodGhpcy4jc3RhdHVzICE9PSBTdGF0dXMuU3FsaXRlRG9uZSkge1xuICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKHRoaXMuI3dhc20sIHRoaXMuI3N0YXR1cyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgcHJlcGFyZWQgcXVlcnkuIFRoaXMgbXVzdCBiZVxuICAgKiBjYWxsZWQgb25jZSB0aGUgcXVlcnkgaXMgbm8gbG9uZ2VyIG5lZWRlZFxuICAgKiB0byBhdm9pZCBsZWFraW5nIHJlc291cmNlcy5cbiAgICpcbiAgICogQWZ0ZXIgYSBwcmVwYXJlZCBxdWVyeSBoYXMgYmVlbiBmaW5hbGl6ZWQsXG4gICAqIGNhbGxzIHRvIGBpdGVyYCwgYGFsbGAsIGBmaXJzdGAsIGBleGVjdXRlYCxcbiAgICogb3IgYGNvbHVtbnNgIHdpbGwgZmFpbC5cbiAgICpcbiAgICogVXNpbmcgaXRlcmF0b3JzIHdoaWNoIHdlcmUgcHJldmlvdXNseSByZXR1cm5lZFxuICAgKiBmcm9tIHRoZSBmaW5hbGl6ZWQgcXVlcnkgd2lsbCBmYWlsLlxuICAgKlxuICAgKiBgZmluYWxpemVgIG1heSBzYWZlbHkgYmUgY2FsbGVkIG11bHRpcGxlXG4gICAqIHRpbWVzLlxuICAgKi9cbiAgZmluYWxpemUoKSB7XG4gICAgaWYgKCF0aGlzLiNmaW5hbGl6ZWQpIHtcbiAgICAgIHRoaXMuI3dhc20uZmluYWxpemUodGhpcy4jc3RtdCk7XG4gICAgICB0aGlzLiNvcGVuU3RhdGVtZW50cy5kZWxldGUodGhpcy4jc3RtdCk7XG4gICAgICB0aGlzLiNmaW5hbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjb2x1bW4gbmFtZXMgZm9yIHRoaXMgcXVlcnkuXG4gICAqL1xuICBjb2x1bW5zKCk6IEFycmF5PENvbHVtbk5hbWU+IHtcbiAgICBpZiAodGhpcy4jZmluYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoXG4gICAgICAgIFwiVW5hYmxlIHRvIHJldHJpZXZlIGNvbHVtbiBuYW1lcyBmcm9tIGZpbmFsaXplZCB0cmFuc2FjdGlvbi5cIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgY29sdW1uQ291bnQgPSB0aGlzLiN3YXNtLmNvbHVtbl9jb3VudCh0aGlzLiNzdG10KTtcbiAgICBjb25zdCBjb2x1bW5zOiBBcnJheTxDb2x1bW5OYW1lPiA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29sdW1uQ291bnQ7IGkrKykge1xuICAgICAgY29uc3QgbmFtZSA9IGdldFN0cihcbiAgICAgICAgdGhpcy4jd2FzbSxcbiAgICAgICAgdGhpcy4jd2FzbS5jb2x1bW5fbmFtZSh0aGlzLiNzdG10LCBpKSxcbiAgICAgICk7XG4gICAgICBjb25zdCBvcmlnaW5OYW1lID0gZ2V0U3RyKFxuICAgICAgICB0aGlzLiN3YXNtLFxuICAgICAgICB0aGlzLiN3YXNtLmNvbHVtbl9vcmlnaW5fbmFtZSh0aGlzLiNzdG10LCBpKSxcbiAgICAgICk7XG4gICAgICBjb25zdCB0YWJsZU5hbWUgPSBnZXRTdHIoXG4gICAgICAgIHRoaXMuI3dhc20sXG4gICAgICAgIHRoaXMuI3dhc20uY29sdW1uX3RhYmxlX25hbWUodGhpcy4jc3RtdCwgaSksXG4gICAgICApO1xuICAgICAgY29sdW1ucy5wdXNoKHsgbmFtZSwgb3JpZ2luTmFtZSwgdGFibGVOYW1lIH0pO1xuICAgIH1cbiAgICByZXR1cm4gY29sdW1ucztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBTUUwgc3RyaW5nIHVzZWQgdG8gY29uc3RydWN0IHRoaXNcbiAgICogcXVlcnksIHN1YnN0aXR1dGluZyBwbGFjZWhvbGRlcnMgKGUuZy4gYD9gKSB3aXRoXG4gICAqIHRoZWlyIHZhbHVlcyBzdXBwbGllZCBpbiBgcGFyYW1zYC5cbiAgICpcbiAgICogQ2FsbGluZyB0aGlzIGZ1bmN0aW9uIGludmFsaWRhdGVzIGFueSBpdGVyYXRvcnNcbiAgICogcHJldmlvdXNseSByZXR1cm5lZCBieSBjYWxscyB0byBgaXRlcmAuXG4gICAqXG4gICAqIFNlZSBgUXVlcnlQYXJhbWV0ZXJTZXRgIGZvciBkb2N1bWVudGF0aW9uIG9uXG4gICAqIGhvdyB2YWx1ZXMgY2FuIGJlIGJvdW5kIHRvIFNRTCBzdGF0ZW1lbnRzLlxuICAgKi9cbiAgZXhwYW5kU3FsKHBhcmFtcz86IFApOiBzdHJpbmcge1xuICAgIHRoaXMuI3N0YXJ0UXVlcnkocGFyYW1zKTtcbiAgICBjb25zdCBwdHIgPSB0aGlzLiN3YXNtLmV4cGFuZGVkX3NxbCh0aGlzLiNzdG10KTtcbiAgICBjb25zdCBzcWwgPSBnZXRTdHIodGhpcy4jd2FzbSwgcHRyKTtcbiAgICBpZiAocHRyICE9IFZhbHVlcy5OdWxsKSB0aGlzLiN3YXNtLnNxbGl0ZV9mcmVlKHB0cik7XG4gICAgcmV0dXJuIHNxbDtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxTQUFTLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLFlBQVk7QUFDbkQsU0FBUyxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sUUFBUSxpQkFBaUI7QUFDdkQsU0FBUyxXQUFXLFFBQVEsYUFBYTtlQTBadEMsT0FBTyxRQUFRO0FBaFNsQjs7O0NBR0MsR0FDRCxPQUFPLE1BQU07RUFLWCxDQUFBLElBQUssQ0FBTztFQUNaLENBQUEsSUFBSyxDQUFlO0VBQ3BCLENBQUEsY0FBZSxDQUFvQjtFQUVuQyxDQUFBLE1BQU8sQ0FBUztFQUNoQixDQUFBLE1BQU8sQ0FBVTtFQUNqQixDQUFBLE9BQVEsQ0FBaUI7RUFD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
// denoCacheMetadata=3050951959376173734,18189929664331757692