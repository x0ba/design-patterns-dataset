import { instantiate } from "../build/sqlite.js";
import { setStr } from "./wasm.ts";
import { DeserializeFlags, FunctionFlags, OpenFlags, Status, Values } from "./constants.ts";
import { SqliteError } from "./error.ts";
import { PreparedQuery } from "./query.ts";
import { wrapSqlFunction } from "./function.ts";
/**
 * A database handle that can be used to run
 * queries.
 */ export class DB {
  #wasm;
  #functions;
  #open;
  #statements;
  #functionNames;
  #transactionDepth;
  /**
   * Create a new database. The file at the
   * given path will be opened with the
   * mode specified in options. The default
   * mode is `create`.
   *
   * If no path is given, or if the `memory`
   * option is set, the database is opened in
   * memory.
   *
   * # Examples
   *
   * Create an in-memory database.
   * ```typescript
   * const db = new DB();
   * ```
   *
   * Open a database backed by a file on disk.
   * ```typescript
   * const db = new DB("path/to/database.sqlite");
   * ```
   *
   * Pass options to open a read-only database.
   * ```typescript
   * const db = new DB("path/to/database.sqlite", { mode: "read" });
   * ```
   */ constructor(path = ":memory:", options = {}){
    const instance = instantiate();
    this.#wasm = instance.exports;
    this.#functions = instance.functions;
    this.#open = false;
    this.#statements = new Set();
    this.#functionNames = new Map();
    this.#transactionDepth = 0;
    // Configure flags
    let flags = 0;
    switch(options.mode){
      case "read":
        flags = OpenFlags.ReadOnly;
        break;
      case "write":
        flags = OpenFlags.ReadWrite;
        break;
      case "create":
      default:
        flags = OpenFlags.ReadWrite | OpenFlags.Create;
        break;
    }
    if (options.memory === true) {
      flags |= OpenFlags.Memory;
    }
    if (options.uri === true) {
      flags |= OpenFlags.Uri;
    }
    // Try to open the database
    const status = setStr(this.#wasm, path, (ptr)=>this.#wasm.open(ptr, flags));
    if (status !== Status.SqliteOk) {
      throw new SqliteError(this.#wasm, status);
    }
    this.#open = true;
  }
  /**
   * Query the database and return all matching
   * rows.
   *
   * This is equivalent to calling `all` on
   * a prepared query which is then immediately
   * finalized.
   *
   * The type parameter `R` may be supplied by
   * the user to indicated the type for the rows returned
   * by the query. Notice that the user is responsible
   * for ensuring the correctness of the supplied type.
   *
   * To avoid SQL injection, user-provided values
   * should always be passed to the database through
   * a query parameter.
   *
   * See `QueryParameterSet` for documentation on
   * how values can be bound to SQL statements.
   *
   * See `QueryParameter` for documentation on how
   * values are returned from the database.
   *
   * # Examples
   *
   * ```typescript
   * const rows = db.query<[string, number]>("SELECT name, age FROM people WHERE city = ?", [city]);
   * // rows = [["Peter Parker", 21], ...]
   * ```
   *
   * ```typescript
   * const rows = db.query<[string, number]>(
   *   "SELECT name, age FROM people WHERE city = :city",
   *   { city },
   *  );
   * // rows = [["Peter Parker", 21], ...]
   * ```
   */ query(sql, params) {
    const query = this.prepareQuery(sql);
    try {
      const rows = query.all(params);
      query.finalize();
      return rows;
    } catch (err) {
      query.finalize();
      throw err;
    }
  }
  /**
   * Like `query` except each row is returned
   * as an object containing key-value pairs.
   *
   * # Examples
   *
   * ```typescript
   * const rows = db.queryEntries<{ name: string, age: number }>("SELECT name, age FROM people");
   * // rows = [{ name: "Peter Parker", age: 21 }, ...]
   * ```
   *
   * ```typescript
   * const rows = db.queryEntries<{ name: string, age: number }>(
   *   "SELECT name, age FROM people WHERE age >= :minAge",
   *   { minAge },
   *  );
   * // rows = [{ name: "Peter Parker", age: 21 }, ...]
   * ```
   */ queryEntries(sql, params) {
    const query = this.prepareQuery(sql);
    try {
      const rows = query.allEntries(params);
      query.finalize();
      return rows;
    } catch (err) {
      query.finalize();
      throw err;
    }
  }
  /**
   * Prepares the given SQL query, so that it
   * can be run multiple times and potentially
   * with different parameters.
   *
   * If a query will be issued a lot, this is more
   * efficient than using `query`. A prepared
   * query also provides more control over how
   * the query is run, as well as access to meta-data
   * about the issued query.
   *
   * The returned `PreparedQuery` object must be
   * finalized by calling its `finalize` method
   * once it is no longer needed.
   *
   * # Typing Queries
   *
   * Prepared query objects accept three type parameters
   * to specify precise types for returned data and
   * query parameters.
   *
   * - The first type parameter `R` indicates the tuple type
   *   for rows returned by the query.
   *
   * - The second type parameter `O` indicates the record type
   *   for rows returned as entries (mappings from column names
   *   to values).
   *
   * - The third type parameter `P` indicates the type this query
   *   accepts as parameters.
   *
   * Note, that the correctness of those types must
   * be guaranteed by the caller of this function.
   *
   * # Example
   *
   * ```typescript
   * const query = db.prepareQuery<
   *   [string, number],
   *   { name: string, age: number },
   *   { city: string },
   *  >("SELECT name, age FROM people WHERE city = :city");
   * // use query ...
   * query.finalize();
   * ```
   */ prepareQuery(sql) {
    if (!this.#open) {
      throw new SqliteError("Database was closed.");
    }
    const stmt = setStr(this.#wasm, sql, (ptr)=>this.#wasm.prepare(ptr));
    if (stmt === Values.Null) {
      throw new SqliteError(this.#wasm);
    }
    this.#statements.add(stmt);
    return new PreparedQuery(this.#wasm, stmt, this.#statements);
  }
  /**
   * Run multiple semicolon-separated statements from a single
   * string.
   *
   * This method cannot bind any query parameters, and any
   * result rows are discarded. It is only for running a chunk
   * of raw SQL; for example, to initialize a database.
   *
   * # Example
   *
   * ```typescript
   * db.execute(`
   *   CREATE TABLE people (
   *     id INTEGER PRIMARY KEY AUTOINCREMENT,
   *     name TEXT,
   *     age REAL,
   *     city TEXT
   *   );
   *   INSERT INTO people (name, age, city) VALUES ('Peter Parker', 21, 'nyc');
   * `);
   * ```
   */ execute(sql) {
    const status = setStr(this.#wasm, sql, (ptr)=>this.#wasm.exec(ptr));
    if (status !== Status.SqliteOk) {
      throw new SqliteError(this.#wasm, status);
    }
  }
  /**
   * Run a function within the context of a database
   * transaction. If the function throws an error,
   * the transaction is rolled back. Otherwise, the
   * transaction is committed when the function returns.
   *
   * Calls to `transaction` may be nested. Nested transactions
   * behave like SQLite save points.
   *
   * # Example
   *
   * ```typescript
   * db.transaction(() => {
   *   // call db.query ...
   *   db.transaction(() => {
   *     // nested transaction
   *   });
   *   // throw to roll back everything
   * });
   * ```
   */ transaction(closure) {
    this.#transactionDepth += 1;
    this.execute(`SAVEPOINT _deno_sqlite_sp_${this.#transactionDepth}`);
    try {
      return closure();
    } catch (err) {
      this.execute(`ROLLBACK TO _deno_sqlite_sp_${this.#transactionDepth}`);
      throw err;
    } finally{
      this.execute(`RELEASE _deno_sqlite_sp_${this.#transactionDepth}`);
      this.#transactionDepth -= 1;
    }
  }
  /**
   * Serialize a database.
   *
   * The format is the same as would be written to disk
   * when modifying a database opened from a file. So for
   * an on-disk database file, this is just a copy of the
   * file contents on disk.
   *
   * If no `schema` name is specified the default
   * (`main`) schema is serialized.
   *
   * # Examples
   *
   * ```typescript
   * const data = db.serialize();
   * ```
   *
   * Serialize the in-memory temporary database
   *
   * ```typescript
   * const temp = db.serialize("temp");
   * ```
   */ serialize(schema = "main") {
    const ptr = setStr(this.#wasm, schema, (ptr)=>this.#wasm.serialize(ptr));
    if (ptr === Values.Null) {
      throw new SqliteError(`Failed to serialize database '${schema}'`);
    }
    const length = this.#wasm.serialize_bytes();
    // Make a copy of the returned data
    const data = new Uint8Array(this.#wasm.memory.buffer, ptr, length).slice();
    this.#wasm.sqlite_free(ptr);
    return data;
  }
  /**
   * Deserialize a database.
   *
   * The format is the same as would be read from disk
   * when opening a database from a file.
   *
   * When the database is deserialized, the contents of
   * the passed `data` buffer are copied.
   *
   * # Examples
   *
   * Replace the default (`main`) database schema
   * with the contents from `data`.
   *
   * ```typescript
   * db.deserialize(data);
   * ```
   *
   * Create an in-memory database from a buffer.
   *
   * ```typescript
   * const db = new DB();
   * db.deserialize(data);
   * ```
   *
   * Deserialize `data` as a read-only database.
   *
   * ```typescript
   * db.deserialize(data, { mode: "read" });
   * ```
   *
   * Specify a schema name different from `main`.
   * Note that it is not possible to deserialize into
   * the `temp` database.
   *
   * ```typescript
   * db.execute("ATTACH DATABASE ':memory:' AS other"); // create schema 'other'
   * db.deserialize(data, { schema: "other" });
   * ```
   *
   * For more details see https://www.sqlite.org/c3ref/deserialize.html
   * and https://www.sqlite.org/lang_attach.html.
   */ deserialize(data, options) {
    const dataPtr = this.#wasm.sqlite_malloc(data.length);
    if (dataPtr === Values.Null) {
      throw new SqliteError("Out of memory.", Status.SqliteNoMem);
    } else {
      const mem = new Uint8Array(this.#wasm.memory.buffer, dataPtr, data.length);
      mem.set(data);
    }
    let flags = DeserializeFlags.FreeOnClose;
    switch(options?.mode){
      case "read":
        flags |= DeserializeFlags.ReadOnly;
        break;
      case "write":
      default:
        flags |= DeserializeFlags.Resizeable;
        break;
    }
    const schema = options?.schema ?? "main";
    const status = setStr(this.#wasm, schema, (schemaPtr)=>this.#wasm.deserialize(schemaPtr, dataPtr, data.length, flags));
    if (status !== Status.SqliteOk) {
      throw new SqliteError(`Failed to deserialize into database '${schema}'`, status);
    }
  }
  /**
   * Creates a custom (scalar) SQL function that can be
   * used in queries.
   *
   * # Examples
   *
   * ```typescript
   * const log = (value: unknown) => {
   *   console.log(value);
   *   return value;
   * };
   * db.createFunction(log);
   * db.query("SELECT name, log(updated_at) FROM users");
   * ```
   *
   * If a function is pure (i.e. always returns the same result
   * given the same input), it can be marked as `deterministic` to
   * enable additional optimizations.
   *
   * ```typescript
   * const discount = (price: number, salePercent: number) => num * (1 - salePercent / 100);
   * db.createFunction(discount, { deterministic: true });
   * db.query("SELECT name, discount(price, :sale) FROM products", { sale: 15 });
   * ```
   *
   * The function name can be set explicitly.
   *
   * ```typescript
   * db.createFunction(() => Math.random(), { name: "jsRandom" });
   * db.query("SELECT jsRandom()");
   * ```
   *
   * Functions can also take a variable number of arguments.
   *
   * ```typescript
   * const sum = (...nums: number[]) => nums.reduce((sum, num) => sum + num, 0);
   * db.createFunction(sum, { deterministic: true });
   * db.query("SELECT sum(1, 2), sum(1,2,3,4)");
   * ```
   */ createFunction(func, options) {
    const name = options?.name ?? func.name;
    if (name === "") {
      throw new SqliteError("Function name can not be empty");
    } else if (this.#functionNames.has(name)) {
      throw new SqliteError(`A function named '${name}' already exists`);
    }
    const argc = func.length === 0 ? -1 : func.length;
    let flags = 0;
    if (options?.deterministic ?? false) flags |= FunctionFlags.Deterministic;
    if (options?.directOnly ?? true) flags |= FunctionFlags.DirectOnly;
    let funcIdx = 0;
    while(this.#functions[funcIdx] != undefined)funcIdx++;
    const status = setStr(this.#wasm, name, (name)=>this.#wasm.create_function(name, argc, flags, funcIdx));
    if (status !== Status.SqliteOk) {
      throw new SqliteError(this.#wasm, status);
    } else {
      this.#functions[funcIdx] = wrapSqlFunction(this.#wasm, name, /* This cast is not fully correct (because function arguments
         * are contra-variant), but makes defining custom functions
         * slightly nicer. */ func);
      this.#functionNames.set(name, funcIdx);
    }
  }
  /**
   * Delete a user-defined SQL function previously
   * created with `createFunction`.
   *
   * After the function is deleted, it can no longer be
   * used in queries, and is free to be re-defined.
   *
   * # Example
   *
   * ```typescript
   * const double = (num: number) => num * 2;
   * db.createFunction(double);
   * // use the function ...
   * db.deleteFunction("double");
   * ```
   */ deleteFunction(name) {
    if (this.#functionNames.has(name)) {
      const status = setStr(this.#wasm, name, (pts)=>this.#wasm.delete_function(pts));
      if (status === Status.SqliteOk) {
        const funcIdx = this.#functionNames.get(name);
        this.#functionNames.delete(name);
        delete this.#functions[funcIdx];
      } else {
        throw new SqliteError(this.#wasm, status);
      }
    } else {
      throw new SqliteError(`User defined function '${name}' does not exist`);
    }
  }
  /**
   * Close the database. This must be called if
   * the database is no longer used to avoid leaking
   * open file descriptors.
   *
   * If called with `force = true`, any non-finalized
   * `PreparedQuery` objects will be finalized. Otherwise,
   * this throws if there are active queries.
   *
   * `close` may safely be called multiple
   * times.
   */ close(force = false) {
    if (!this.#open) {
      return;
    }
    if (force) {
      for (const stmt of this.#statements){
        if (this.#wasm.finalize(stmt) !== Status.SqliteOk) {
          throw new SqliteError(this.#wasm);
        }
      }
    }
    if (this.#wasm.close() !== Status.SqliteOk) {
      throw new SqliteError(this.#wasm);
    }
    this.#open = false;
  }
  /**
   * Get last inserted row id. This corresponds to
   * the SQLite function `sqlite3_last_insert_rowid`.
   *
   * Before a row is inserted for the first time (since
   * the database was opened), this returns `0`.
   */ get lastInsertRowId() {
    return this.#wasm.last_insert_rowid();
  }
  /**
   * Return the number of rows modified, inserted or
   * deleted by the most recently completed query.
   * This corresponds to the SQLite function
   * `sqlite3_changes`.
   */ get changes() {
    return this.#wasm.changes();
  }
  /**
   * Return the number of rows modified, inserted or
   * deleted since the database was opened.
   * This corresponds to the SQLite function
   * `sqlite3_total_changes`.
   */ get totalChanges() {
    return this.#wasm.total_changes();
  }
  /**
   * Returns `true` when in auto commit mode and `false` otherwise.
   * This corresponds to the SQLite function
   * `sqlite3_get_autocommit`.
   */ get autoCommit() {
    return this.#wasm.autocommit() !== 0;
  }
  /**
   * Returns `true` when the database handle is closed
   * and can no longer be used.
   */ get isClosed() {
    return !this.#open;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvLy51aS1jYXB0dXJlL3ZlbmRvci9zcWxpdGUvc3JjL2RiLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGluc3RhbnRpYXRlLCBTdGF0ZW1lbnRQdHIsIFdhc20gfSBmcm9tIFwiLi4vYnVpbGQvc3FsaXRlLmpzXCI7XG5pbXBvcnQgeyBzZXRTdHIgfSBmcm9tIFwiLi93YXNtLnRzXCI7XG5pbXBvcnQge1xuICBEZXNlcmlhbGl6ZUZsYWdzLFxuICBGdW5jdGlvbkZsYWdzLFxuICBPcGVuRmxhZ3MsXG4gIFN0YXR1cyxcbiAgVmFsdWVzLFxufSBmcm9tIFwiLi9jb25zdGFudHMudHNcIjtcbmltcG9ydCB7IFNxbGl0ZUVycm9yIH0gZnJvbSBcIi4vZXJyb3IudHNcIjtcbmltcG9ydCB7IFByZXBhcmVkUXVlcnksIFF1ZXJ5UGFyYW1ldGVyU2V0LCBSb3csIFJvd09iamVjdCB9IGZyb20gXCIuL3F1ZXJ5LnRzXCI7XG5pbXBvcnQge1xuICBTcWxGdW5jdGlvbixcbiAgU3FsRnVuY3Rpb25Bcmd1bWVudCxcbiAgU3FsRnVuY3Rpb25SZXN1bHQsXG4gIHdyYXBTcWxGdW5jdGlvbixcbn0gZnJvbSBcIi4vZnVuY3Rpb24udHNcIjtcblxuLyoqXG4gKiBPcHRpb25zIGZvciBvcGVuaW5nIGEgZGF0YWJhc2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3FsaXRlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBNb2RlIGluIHdoaWNoIHRvIG9wZW4gdGhlIGRhdGFiYXNlLlxuICAgKlxuICAgKiAtIGByZWFkYDogcmVhZC1vbmx5LCB0aHJvd3MgYW4gZXJyb3IgaWZcbiAgICogICB0aGUgZGF0YWJhc2UgZmlsZSBkb2VzIG5vdCBleGlzdHNcbiAgICpcbiAgICogLSBgd3JpdGVgOiByZWFkLXdyaXRlLCB0aHJvd3MgYW4gZXJyb3JcbiAgICogICBpZiB0aGUgZGF0YWJhc2UgZmlsZSBkb2VzIG5vdCBleGlzdHNcbiAgICpcbiAgICogLSBgY3JlYXRlYDogcmVhZC13cml0ZSwgY3JlYXRlIHRoZSBkYXRhYmFzZVxuICAgKiAgIGlmIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0IChmb3IgYW4gaW4tbWVtb3J5XG4gICAqICAgZGF0YWJhc2UgdGhpcyBpcyB0aGUgc2FtZSBhcyBgd3JpdGVgKVxuICAgKlxuICAgKiBgY3JlYXRlYCBpcyB0aGUgZGVmYXVsdCBpZiBubyBtb2RlIGlzXG4gICAqIHNwZWNpZmllZC5cbiAgICovXG4gIG1vZGU/OiBcInJlYWRcIiB8IFwid3JpdGVcIiB8IFwiY3JlYXRlXCI7XG4gIC8qKlxuICAgKiBGb3JjZSB0aGUgZGF0YWJhc2UgdG8gYmUgaW4tbWVtb3J5LiBXaGVuXG4gICAqIHRoaXMgb3B0aW9uIGlzIHNldCwgdGhlIGRhdGFiYXNlIGlzIG9wZW5lZFxuICAgKiBpbiBtZW1vcnksIHJlZ2FyZGxlc3Mgb2YgdGhlIHNwZWNpZmllZFxuICAgKiBmaWxlbmFtZS5cbiAgICovXG4gIG1lbW9yeT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBJbnRlcnByZXQgdGhlIGZpbGUgbmFtZSBhcyBhIFVSSS5cbiAgICogU2VlIGh0dHBzOi8vc3FsaXRlLm9yZy91cmkuaHRtbFxuICAgKiBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICovXG4gIHVyaT86IGJvb2xlYW47XG59XG5cbi8qKlxuICogT3B0aW9ucyBmb3Igb3BlbmluZyBhIGRhdGFiYXNlIGZyb20gYW4gaW4tbWVtb3J5XG4gKiBidWZmZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3FsaXRlRGVzZXJpYWxpemVPcHRpb25zIHtcbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIHNjaGVtYSB0byBkZXNlcmlhbGl6ZSBpbnRvLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCBzY2hlbWEgbmFtZSBpcyBgbWFpbmAsIHdoaWNoXG4gICAqIHJlZmVycyB0byB0aGUgZGF0YWJhc2Ugb3BlbmVkIG9yaWdpbmFsbHkuXG4gICAqXG4gICAqIElmIGEgZGF0YWJhc2Ugc2NoZW1hIHdpdGggdGhlIGdpdmVuIG5hbWVcbiAgICogZG9lcyBub3QgZXhpc3QsIHRoaXMgZmFpbHMuXG4gICAqL1xuICBzY2hlbWE/OiBcIm1haW5cIiB8IHN0cmluZztcbiAgLyoqXG4gICAqIE1vZGUgaW4gd2hpY2ggdG8gb3BlbiB0aGUgZGVzZXJpYWxpemVkXG4gICAqIGRhdGFiYXNlLlxuICAgKlxuICAgKiAtIGByZWFkYDogb3BlbnMgYSByZWFkLW9ubHkgZGF0YWJhc2VcbiAgICpcbiAgICogLSBgd3JpdGVgOiBvcGVucyBhIHJlYWQtd3JpdGUgZGF0YWJhc2VcbiAgICogICBpbiBtZW1vcnlcbiAgICpcbiAgICogYHdyaXRlYCBpcyB0aGUgZGVmYXVsdCBpZiBubyBtb2RlIGlzXG4gICAqIHNwZWNpZmllZC5cbiAgICovXG4gIG1vZGU/OiBcInJlYWRcIiB8IFwid3JpdGVcIjtcbn1cblxuLyoqXG4gKiBPcHRpb25zIGZvciBkZWZpbmluZyBhIGN1c3RvbSBTUUwgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3FsaXRlRnVuY3Rpb25PcHRpb25zIHtcbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIGN1c3RvbSBmdW5jdGlvbiB0byBiZSB1c2VkIG9uXG4gICAqIHRoZSBTUUwgc2lkZS5cbiAgICpcbiAgICogSWYgdGhpcyBhcmd1bWVudCBpcyBvbWl0dGVkLCB0aGUgZnVuY3Rpb24nc1xuICAgKiBuYW1lIGlzIHVzZWQuIEUuZy5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBmdW5jdGlvbiBmb28oLi4uKSB7IC4uLiB9XG4gICAqIGNvbnN0IGZvbyA9ICguLi4pID0+IC4uLjtcbiAgICogY29uc3QgYmFyID0gZnVuY3Rpb24gZm9vKC4uLikgeyAuLi4gfTtcbiAgICogYGBgXG4gICAqXG4gICAqIHdvdWxkIGFsbCBiZSBjYWxsZWQgYGZvb2Agb24gdGhlIFNRTCBzaWRlLlxuICAgKi9cbiAgbmFtZT86IHN0cmluZztcbiAgLyoqXG4gICAqIEVuYWJsZXMgYWRkaXRpb25hbCBxdWVyeSBvcHRpbWl6YXRpb25zIGlmXG4gICAqIGEgZnVuY3Rpb24gaXMgcHVyZSAoaS5lLiBpZiBpdCBhbHdheXMgcmV0dXJuc1xuICAgKiB0aGUgc2FtZSBvdXRwdXQgZ2l2ZW4gdGhlIHNhbWUgaW5wdXQpLlxuICAgKlxuICAgKiBCeSBkZWZhdWx0IHRoaXMgaXMgYXNzdW1lZCBgZmFsc2VgLlxuICAgKi9cbiAgZGV0ZXJtaW5pc3RpYz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBJZiBgZGlyZWN0T25seWAgaXMgYHRydWVgLCB0aGUgYFNRTElURV9ESVJFQ1RPTkxZYFxuICAgKiBmbGFnIGlzIHNldCB3aGVuIGNyZWF0aW5nIHRoZSB1c2VyLWRlZmluZWQgZnVuY3Rpb24uXG4gICAqXG4gICAqIFNldHRpbmcgdGhpcyBmbGFnIG1lYW5zIHRoZSBmdW5jdGlvbiBjYW4gb25seSBiZVxuICAgKiBpbnZva2VkIGZyb20gdG9wLWxldmVsIFNRTCAoZS5nLiBpdCBjYW4ndCBiZSB1c2VkXG4gICAqIGluc2lkZSBWSUVXcyBvciBUUklHR0VScykuXG4gICAqXG4gICAqIFRoaXMgaXMgYSBzZWN1cml0eSBmZWF0dXJlIHRoYXQgcHJldmVudHMgZnVuY3Rpb25zXG4gICAqIHRvIGJlIGludm9rZWQgYnkgbWFsaWNpb3VzIGlucHV0cyB0byB0aGUgZGF0YWJhc2UgL1xuICAgKiBtYWxpY2lvdXMgdmFsdWVzIHNldCBpbiBib3VuZCBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBCeSBkZWZhdWx0IHRoaXMgaXMgYXNzdW1lZCBgdHJ1ZWAuXG4gICAqXG4gICAqIFNlZSBodHRwczovL3d3dy5zcWxpdGUub3JnL2MzcmVmL2NfZGV0ZXJtaW5pc3RpYy5odG1sI3NxbGl0ZWRpcmVjdG9ubHlcbiAgICogZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAqL1xuICBkaXJlY3RPbmx5PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBBIGRhdGFiYXNlIGhhbmRsZSB0aGF0IGNhbiBiZSB1c2VkIHRvIHJ1blxuICogcXVlcmllcy5cbiAqL1xuZXhwb3J0IGNsYXNzIERCIHtcbiAgI3dhc206IFdhc207XG4gICNmdW5jdGlvbnM6IEFycmF5PChhcmdjOiBudW1iZXIpID0+IHZvaWQ+O1xuICAjb3BlbjogYm9vbGVhbjtcblxuICAjc3RhdGVtZW50czogU2V0PFN0YXRlbWVudFB0cj47XG4gICNmdW5jdGlvbk5hbWVzOiBNYXA8c3RyaW5nLCBudW1iZXI+O1xuICAjdHJhbnNhY3Rpb25EZXB0aDogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgZGF0YWJhc2UuIFRoZSBmaWxlIGF0IHRoZVxuICAgKiBnaXZlbiBwYXRoIHdpbGwgYmUgb3BlbmVkIHdpdGggdGhlXG4gICAqIG1vZGUgc3BlY2lmaWVkIGluIG9wdGlvbnMuIFRoZSBkZWZhdWx0XG4gICAqIG1vZGUgaXMgYGNyZWF0ZWAuXG4gICAqXG4gICAqIElmIG5vIHBhdGggaXMgZ2l2ZW4sIG9yIGlmIHRoZSBgbWVtb3J5YFxuICAgKiBvcHRpb24gaXMgc2V0LCB0aGUgZGF0YWJhc2UgaXMgb3BlbmVkIGluXG4gICAqIG1lbW9yeS5cbiAgICpcbiAgICogIyBFeGFtcGxlc1xuICAgKlxuICAgKiBDcmVhdGUgYW4gaW4tbWVtb3J5IGRhdGFiYXNlLlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IGRiID0gbmV3IERCKCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBPcGVuIGEgZGF0YWJhc2UgYmFja2VkIGJ5IGEgZmlsZSBvbiBkaXNrLlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IGRiID0gbmV3IERCKFwicGF0aC90by9kYXRhYmFzZS5zcWxpdGVcIik7XG4gICAqIGBgYFxuICAgKlxuICAgKiBQYXNzIG9wdGlvbnMgdG8gb3BlbiBhIHJlYWQtb25seSBkYXRhYmFzZS5cbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBkYiA9IG5ldyBEQihcInBhdGgvdG8vZGF0YWJhc2Uuc3FsaXRlXCIsIHsgbW9kZTogXCJyZWFkXCIgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY29uc3RydWN0b3IocGF0aDogc3RyaW5nID0gXCI6bWVtb3J5OlwiLCBvcHRpb25zOiBTcWxpdGVPcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBpbnN0YW5jZSA9IGluc3RhbnRpYXRlKCk7XG4gICAgdGhpcy4jd2FzbSA9IGluc3RhbmNlLmV4cG9ydHM7XG4gICAgdGhpcy4jZnVuY3Rpb25zID0gaW5zdGFuY2UuZnVuY3Rpb25zO1xuICAgIHRoaXMuI29wZW4gPSBmYWxzZTtcblxuICAgIHRoaXMuI3N0YXRlbWVudHMgPSBuZXcgU2V0KCk7XG4gICAgdGhpcy4jZnVuY3Rpb25OYW1lcyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLiN0cmFuc2FjdGlvbkRlcHRoID0gMDtcblxuICAgIC8vIENvbmZpZ3VyZSBmbGFnc1xuICAgIGxldCBmbGFncyA9IDA7XG4gICAgc3dpdGNoIChvcHRpb25zLm1vZGUpIHtcbiAgICAgIGNhc2UgXCJyZWFkXCI6XG4gICAgICAgIGZsYWdzID0gT3BlbkZsYWdzLlJlYWRPbmx5O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJ3cml0ZVwiOlxuICAgICAgICBmbGFncyA9IE9wZW5GbGFncy5SZWFkV3JpdGU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImNyZWF0ZVwiOiAvLyBmYWxsIHRocm91Z2hcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGZsYWdzID0gT3BlbkZsYWdzLlJlYWRXcml0ZSB8IE9wZW5GbGFncy5DcmVhdGU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5tZW1vcnkgPT09IHRydWUpIHtcbiAgICAgIGZsYWdzIHw9IE9wZW5GbGFncy5NZW1vcnk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnVyaSA9PT0gdHJ1ZSkge1xuICAgICAgZmxhZ3MgfD0gT3BlbkZsYWdzLlVyaTtcbiAgICB9XG5cbiAgICAvLyBUcnkgdG8gb3BlbiB0aGUgZGF0YWJhc2VcbiAgICBjb25zdCBzdGF0dXMgPSBzZXRTdHIoXG4gICAgICB0aGlzLiN3YXNtLFxuICAgICAgcGF0aCxcbiAgICAgIChwdHIpID0+IHRoaXMuI3dhc20ub3BlbihwdHIsIGZsYWdzKSxcbiAgICApO1xuICAgIGlmIChzdGF0dXMgIT09IFN0YXR1cy5TcWxpdGVPaykge1xuICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKHRoaXMuI3dhc20sIHN0YXR1cyk7XG4gICAgfVxuICAgIHRoaXMuI29wZW4gPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFF1ZXJ5IHRoZSBkYXRhYmFzZSBhbmQgcmV0dXJuIGFsbCBtYXRjaGluZ1xuICAgKiByb3dzLlxuICAgKlxuICAgKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gY2FsbGluZyBgYWxsYCBvblxuICAgKiBhIHByZXBhcmVkIHF1ZXJ5IHdoaWNoIGlzIHRoZW4gaW1tZWRpYXRlbHlcbiAgICogZmluYWxpemVkLlxuICAgKlxuICAgKiBUaGUgdHlwZSBwYXJhbWV0ZXIgYFJgIG1heSBiZSBzdXBwbGllZCBieVxuICAgKiB0aGUgdXNlciB0byBpbmRpY2F0ZWQgdGhlIHR5cGUgZm9yIHRoZSByb3dzIHJldHVybmVkXG4gICAqIGJ5IHRoZSBxdWVyeS4gTm90aWNlIHRoYXQgdGhlIHVzZXIgaXMgcmVzcG9uc2libGVcbiAgICogZm9yIGVuc3VyaW5nIHRoZSBjb3JyZWN0bmVzcyBvZiB0aGUgc3VwcGxpZWQgdHlwZS5cbiAgICpcbiAgICogVG8gYXZvaWQgU1FMIGluamVjdGlvbiwgdXNlci1wcm92aWRlZCB2YWx1ZXNcbiAgICogc2hvdWxkIGFsd2F5cyBiZSBwYXNzZWQgdG8gdGhlIGRhdGFiYXNlIHRocm91Z2hcbiAgICogYSBxdWVyeSBwYXJhbWV0ZXIuXG4gICAqXG4gICAqIFNlZSBgUXVlcnlQYXJhbWV0ZXJTZXRgIGZvciBkb2N1bWVudGF0aW9uIG9uXG4gICAqIGhvdyB2YWx1ZXMgY2FuIGJlIGJvdW5kIHRvIFNRTCBzdGF0ZW1lbnRzLlxuICAgKlxuICAgKiBTZWUgYFF1ZXJ5UGFyYW1ldGVyYCBmb3IgZG9jdW1lbnRhdGlvbiBvbiBob3dcbiAgICogdmFsdWVzIGFyZSByZXR1cm5lZCBmcm9tIHRoZSBkYXRhYmFzZS5cbiAgICpcbiAgICogIyBFeGFtcGxlc1xuICAgKlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHJvd3MgPSBkYi5xdWVyeTxbc3RyaW5nLCBudW1iZXJdPihcIlNFTEVDVCBuYW1lLCBhZ2UgRlJPTSBwZW9wbGUgV0hFUkUgY2l0eSA9ID9cIiwgW2NpdHldKTtcbiAgICogLy8gcm93cyA9IFtbXCJQZXRlciBQYXJrZXJcIiwgMjFdLCAuLi5dXG4gICAqIGBgYFxuICAgKlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHJvd3MgPSBkYi5xdWVyeTxbc3RyaW5nLCBudW1iZXJdPihcbiAgICogICBcIlNFTEVDVCBuYW1lLCBhZ2UgRlJPTSBwZW9wbGUgV0hFUkUgY2l0eSA9IDpjaXR5XCIsXG4gICAqICAgeyBjaXR5IH0sXG4gICAqICApO1xuICAgKiAvLyByb3dzID0gW1tcIlBldGVyIFBhcmtlclwiLCAyMV0sIC4uLl1cbiAgICogYGBgXG4gICAqL1xuICBxdWVyeTxSIGV4dGVuZHMgUm93ID0gUm93PihcbiAgICBzcWw6IHN0cmluZyxcbiAgICBwYXJhbXM/OiBRdWVyeVBhcmFtZXRlclNldCxcbiAgKTogQXJyYXk8Uj4ge1xuICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5wcmVwYXJlUXVlcnk8Uj4oc3FsKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgcm93cyA9IHF1ZXJ5LmFsbChwYXJhbXMpO1xuICAgICAgcXVlcnkuZmluYWxpemUoKTtcbiAgICAgIHJldHVybiByb3dzO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgcXVlcnkuZmluYWxpemUoKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTGlrZSBgcXVlcnlgIGV4Y2VwdCBlYWNoIHJvdyBpcyByZXR1cm5lZFxuICAgKiBhcyBhbiBvYmplY3QgY29udGFpbmluZyBrZXktdmFsdWUgcGFpcnMuXG4gICAqXG4gICAqICMgRXhhbXBsZXNcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCByb3dzID0gZGIucXVlcnlFbnRyaWVzPHsgbmFtZTogc3RyaW5nLCBhZ2U6IG51bWJlciB9PihcIlNFTEVDVCBuYW1lLCBhZ2UgRlJPTSBwZW9wbGVcIik7XG4gICAqIC8vIHJvd3MgPSBbeyBuYW1lOiBcIlBldGVyIFBhcmtlclwiLCBhZ2U6IDIxIH0sIC4uLl1cbiAgICogYGBgXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3Qgcm93cyA9IGRiLnF1ZXJ5RW50cmllczx7IG5hbWU6IHN0cmluZywgYWdlOiBudW1iZXIgfT4oXG4gICAqICAgXCJTRUxFQ1QgbmFtZSwgYWdlIEZST00gcGVvcGxlIFdIRVJFIGFnZSA+PSA6bWluQWdlXCIsXG4gICAqICAgeyBtaW5BZ2UgfSxcbiAgICogICk7XG4gICAqIC8vIHJvd3MgPSBbeyBuYW1lOiBcIlBldGVyIFBhcmtlclwiLCBhZ2U6IDIxIH0sIC4uLl1cbiAgICogYGBgXG4gICAqL1xuICBxdWVyeUVudHJpZXM8TyBleHRlbmRzIFJvd09iamVjdCA9IFJvd09iamVjdD4oXG4gICAgc3FsOiBzdHJpbmcsXG4gICAgcGFyYW1zPzogUXVlcnlQYXJhbWV0ZXJTZXQsXG4gICk6IEFycmF5PE8+IHtcbiAgICBjb25zdCBxdWVyeSA9IHRoaXMucHJlcGFyZVF1ZXJ5PFJvdywgTz4oc3FsKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgcm93cyA9IHF1ZXJ5LmFsbEVudHJpZXMocGFyYW1zKTtcbiAgICAgIHF1ZXJ5LmZpbmFsaXplKCk7XG4gICAgICByZXR1cm4gcm93cztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHF1ZXJ5LmZpbmFsaXplKCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFByZXBhcmVzIHRoZSBnaXZlbiBTUUwgcXVlcnksIHNvIHRoYXQgaXRcbiAgICogY2FuIGJlIHJ1biBtdWx0aXBsZSB0aW1lcyBhbmQgcG90ZW50aWFsbHlcbiAgICogd2l0aCBkaWZmZXJlbnQgcGFyYW1ldGVycy5cbiAgICpcbiAgICogSWYgYSBxdWVyeSB3aWxsIGJlIGlzc3VlZCBhIGxvdCwgdGhpcyBpcyBtb3JlXG4gICAqIGVmZmljaWVudCB0aGFuIHVzaW5nIGBxdWVyeWAuIEEgcHJlcGFyZWRcbiAgICogcXVlcnkgYWxzbyBwcm92aWRlcyBtb3JlIGNvbnRyb2wgb3ZlciBob3dcbiAgICogdGhlIHF1ZXJ5IGlzIHJ1biwgYXMgd2VsbCBhcyBhY2Nlc3MgdG8gbWV0YS1kYXRhXG4gICAqIGFib3V0IHRoZSBpc3N1ZWQgcXVlcnkuXG4gICAqXG4gICAqIFRoZSByZXR1cm5lZCBgUHJlcGFyZWRRdWVyeWAgb2JqZWN0IG11c3QgYmVcbiAgICogZmluYWxpemVkIGJ5IGNhbGxpbmcgaXRzIGBmaW5hbGl6ZWAgbWV0aG9kXG4gICAqIG9uY2UgaXQgaXMgbm8gbG9uZ2VyIG5lZWRlZC5cbiAgICpcbiAgICogIyBUeXBpbmcgUXVlcmllc1xuICAgKlxuICAgKiBQcmVwYXJlZCBxdWVyeSBvYmplY3RzIGFjY2VwdCB0aHJlZSB0eXBlIHBhcmFtZXRlcnNcbiAgICogdG8gc3BlY2lmeSBwcmVjaXNlIHR5cGVzIGZvciByZXR1cm5lZCBkYXRhIGFuZFxuICAgKiBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiAtIFRoZSBmaXJzdCB0eXBlIHBhcmFtZXRlciBgUmAgaW5kaWNhdGVzIHRoZSB0dXBsZSB0eXBlXG4gICAqICAgZm9yIHJvd3MgcmV0dXJuZWQgYnkgdGhlIHF1ZXJ5LlxuICAgKlxuICAgKiAtIFRoZSBzZWNvbmQgdHlwZSBwYXJhbWV0ZXIgYE9gIGluZGljYXRlcyB0aGUgcmVjb3JkIHR5cGVcbiAgICogICBmb3Igcm93cyByZXR1cm5lZCBhcyBlbnRyaWVzIChtYXBwaW5ncyBmcm9tIGNvbHVtbiBuYW1lc1xuICAgKiAgIHRvIHZhbHVlcykuXG4gICAqXG4gICAqIC0gVGhlIHRoaXJkIHR5cGUgcGFyYW1ldGVyIGBQYCBpbmRpY2F0ZXMgdGhlIHR5cGUgdGhpcyBxdWVyeVxuICAgKiAgIGFjY2VwdHMgYXMgcGFyYW1ldGVycy5cbiAgICpcbiAgICogTm90ZSwgdGhhdCB0aGUgY29ycmVjdG5lc3Mgb2YgdGhvc2UgdHlwZXMgbXVzdFxuICAgKiBiZSBndWFyYW50ZWVkIGJ5IHRoZSBjYWxsZXIgb2YgdGhpcyBmdW5jdGlvbi5cbiAgICpcbiAgICogIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3QgcXVlcnkgPSBkYi5wcmVwYXJlUXVlcnk8XG4gICAqICAgW3N0cmluZywgbnVtYmVyXSxcbiAgICogICB7IG5hbWU6IHN0cmluZywgYWdlOiBudW1iZXIgfSxcbiAgICogICB7IGNpdHk6IHN0cmluZyB9LFxuICAgKiAgPihcIlNFTEVDVCBuYW1lLCBhZ2UgRlJPTSBwZW9wbGUgV0hFUkUgY2l0eSA9IDpjaXR5XCIpO1xuICAgKiAvLyB1c2UgcXVlcnkgLi4uXG4gICAqIHF1ZXJ5LmZpbmFsaXplKCk7XG4gICAqIGBgYFxuICAgKi9cbiAgcHJlcGFyZVF1ZXJ5PFxuICAgIFIgZXh0ZW5kcyBSb3cgPSBSb3csXG4gICAgTyBleHRlbmRzIFJvd09iamVjdCA9IFJvd09iamVjdCxcbiAgICBQIGV4dGVuZHMgUXVlcnlQYXJhbWV0ZXJTZXQgPSBRdWVyeVBhcmFtZXRlclNldCxcbiAgPihcbiAgICBzcWw6IHN0cmluZyxcbiAgKTogUHJlcGFyZWRRdWVyeTxSLCBPLCBQPiB7XG4gICAgaWYgKCF0aGlzLiNvcGVuKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoXCJEYXRhYmFzZSB3YXMgY2xvc2VkLlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdG10ID0gc2V0U3RyKFxuICAgICAgdGhpcy4jd2FzbSxcbiAgICAgIHNxbCxcbiAgICAgIChwdHIpID0+IHRoaXMuI3dhc20ucHJlcGFyZShwdHIpLFxuICAgICk7XG4gICAgaWYgKHN0bXQgPT09IFZhbHVlcy5OdWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IodGhpcy4jd2FzbSk7XG4gICAgfVxuXG4gICAgdGhpcy4jc3RhdGVtZW50cy5hZGQoc3RtdCk7XG4gICAgcmV0dXJuIG5ldyBQcmVwYXJlZFF1ZXJ5PFIsIE8sIFA+KHRoaXMuI3dhc20sIHN0bXQsIHRoaXMuI3N0YXRlbWVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1biBtdWx0aXBsZSBzZW1pY29sb24tc2VwYXJhdGVkIHN0YXRlbWVudHMgZnJvbSBhIHNpbmdsZVxuICAgKiBzdHJpbmcuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGNhbm5vdCBiaW5kIGFueSBxdWVyeSBwYXJhbWV0ZXJzLCBhbmQgYW55XG4gICAqIHJlc3VsdCByb3dzIGFyZSBkaXNjYXJkZWQuIEl0IGlzIG9ubHkgZm9yIHJ1bm5pbmcgYSBjaHVua1xuICAgKiBvZiByYXcgU1FMOyBmb3IgZXhhbXBsZSwgdG8gaW5pdGlhbGl6ZSBhIGRhdGFiYXNlLlxuICAgKlxuICAgKiAjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBkYi5leGVjdXRlKGBcbiAgICogICBDUkVBVEUgVEFCTEUgcGVvcGxlIChcbiAgICogICAgIGlkIElOVEVHRVIgUFJJTUFSWSBLRVkgQVVUT0lOQ1JFTUVOVCxcbiAgICogICAgIG5hbWUgVEVYVCxcbiAgICogICAgIGFnZSBSRUFMLFxuICAgKiAgICAgY2l0eSBURVhUXG4gICAqICAgKTtcbiAgICogICBJTlNFUlQgSU5UTyBwZW9wbGUgKG5hbWUsIGFnZSwgY2l0eSkgVkFMVUVTICgnUGV0ZXIgUGFya2VyJywgMjEsICdueWMnKTtcbiAgICogYCk7XG4gICAqIGBgYFxuICAgKi9cbiAgZXhlY3V0ZShzcWw6IHN0cmluZykge1xuICAgIGNvbnN0IHN0YXR1cyA9IHNldFN0cihcbiAgICAgIHRoaXMuI3dhc20sXG4gICAgICBzcWwsXG4gICAgICAocHRyKSA9PiB0aGlzLiN3YXNtLmV4ZWMocHRyKSxcbiAgICApO1xuXG4gICAgaWYgKHN0YXR1cyAhPT0gU3RhdHVzLlNxbGl0ZU9rKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IodGhpcy4jd2FzbSwgc3RhdHVzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVuIGEgZnVuY3Rpb24gd2l0aGluIHRoZSBjb250ZXh0IG9mIGEgZGF0YWJhc2VcbiAgICogdHJhbnNhY3Rpb24uIElmIHRoZSBmdW5jdGlvbiB0aHJvd3MgYW4gZXJyb3IsXG4gICAqIHRoZSB0cmFuc2FjdGlvbiBpcyByb2xsZWQgYmFjay4gT3RoZXJ3aXNlLCB0aGVcbiAgICogdHJhbnNhY3Rpb24gaXMgY29tbWl0dGVkIHdoZW4gdGhlIGZ1bmN0aW9uIHJldHVybnMuXG4gICAqXG4gICAqIENhbGxzIHRvIGB0cmFuc2FjdGlvbmAgbWF5IGJlIG5lc3RlZC4gTmVzdGVkIHRyYW5zYWN0aW9uc1xuICAgKiBiZWhhdmUgbGlrZSBTUUxpdGUgc2F2ZSBwb2ludHMuXG4gICAqXG4gICAqICMgRXhhbXBsZVxuICAgKlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGRiLnRyYW5zYWN0aW9uKCgpID0+IHtcbiAgICogICAvLyBjYWxsIGRiLnF1ZXJ5IC4uLlxuICAgKiAgIGRiLnRyYW5zYWN0aW9uKCgpID0+IHtcbiAgICogICAgIC8vIG5lc3RlZCB0cmFuc2FjdGlvblxuICAgKiAgIH0pO1xuICAgKiAgIC8vIHRocm93IHRvIHJvbGwgYmFjayBldmVyeXRoaW5nXG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHRyYW5zYWN0aW9uPFY+KGNsb3N1cmU6ICgpID0+IFYpOiBWIHtcbiAgICB0aGlzLiN0cmFuc2FjdGlvbkRlcHRoICs9IDE7XG4gICAgdGhpcy5leGVjdXRlKGBTQVZFUE9JTlQgX2Rlbm9fc3FsaXRlX3NwXyR7dGhpcy4jdHJhbnNhY3Rpb25EZXB0aH1gKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGNsb3N1cmUoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuZXhlY3V0ZShgUk9MTEJBQ0sgVE8gX2Rlbm9fc3FsaXRlX3NwXyR7dGhpcy4jdHJhbnNhY3Rpb25EZXB0aH1gKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5leGVjdXRlKGBSRUxFQVNFIF9kZW5vX3NxbGl0ZV9zcF8ke3RoaXMuI3RyYW5zYWN0aW9uRGVwdGh9YCk7XG4gICAgICB0aGlzLiN0cmFuc2FjdGlvbkRlcHRoIC09IDE7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNlcmlhbGl6ZSBhIGRhdGFiYXNlLlxuICAgKlxuICAgKiBUaGUgZm9ybWF0IGlzIHRoZSBzYW1lIGFzIHdvdWxkIGJlIHdyaXR0ZW4gdG8gZGlza1xuICAgKiB3aGVuIG1vZGlmeWluZyBhIGRhdGFiYXNlIG9wZW5lZCBmcm9tIGEgZmlsZS4gU28gZm9yXG4gICAqIGFuIG9uLWRpc2sgZGF0YWJhc2UgZmlsZSwgdGhpcyBpcyBqdXN0IGEgY29weSBvZiB0aGVcbiAgICogZmlsZSBjb250ZW50cyBvbiBkaXNrLlxuICAgKlxuICAgKiBJZiBubyBgc2NoZW1hYCBuYW1lIGlzIHNwZWNpZmllZCB0aGUgZGVmYXVsdFxuICAgKiAoYG1haW5gKSBzY2hlbWEgaXMgc2VyaWFsaXplZC5cbiAgICpcbiAgICogIyBFeGFtcGxlc1xuICAgKlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IGRhdGEgPSBkYi5zZXJpYWxpemUoKTtcbiAgICogYGBgXG4gICAqXG4gICAqIFNlcmlhbGl6ZSB0aGUgaW4tbWVtb3J5IHRlbXBvcmFyeSBkYXRhYmFzZVxuICAgKlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHRlbXAgPSBkYi5zZXJpYWxpemUoXCJ0ZW1wXCIpO1xuICAgKiBgYGBcbiAgICovXG4gIHNlcmlhbGl6ZShzY2hlbWE6IFwibWFpblwiIHwgXCJ0ZW1wXCIgfCBzdHJpbmcgPSBcIm1haW5cIik6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IHB0ciA9IHNldFN0cih0aGlzLiN3YXNtLCBzY2hlbWEsIChwdHIpID0+IHRoaXMuI3dhc20uc2VyaWFsaXplKHB0cikpO1xuICAgIGlmIChwdHIgPT09IFZhbHVlcy5OdWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoYEZhaWxlZCB0byBzZXJpYWxpemUgZGF0YWJhc2UgJyR7c2NoZW1hfSdgKTtcbiAgICB9XG4gICAgY29uc3QgbGVuZ3RoID0gdGhpcy4jd2FzbS5zZXJpYWxpemVfYnl0ZXMoKTtcbiAgICAvLyBNYWtlIGEgY29weSBvZiB0aGUgcmV0dXJuZWQgZGF0YVxuICAgIGNvbnN0IGRhdGEgPSBuZXcgVWludDhBcnJheSh0aGlzLiN3YXNtLm1lbW9yeS5idWZmZXIsIHB0ciwgbGVuZ3RoKS5zbGljZSgpO1xuICAgIHRoaXMuI3dhc20uc3FsaXRlX2ZyZWUocHRyKTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXNlcmlhbGl6ZSBhIGRhdGFiYXNlLlxuICAgKlxuICAgKiBUaGUgZm9ybWF0IGlzIHRoZSBzYW1lIGFzIHdvdWxkIGJlIHJlYWQgZnJvbSBkaXNrXG4gICAqIHdoZW4gb3BlbmluZyBhIGRhdGFiYXNlIGZyb20gYSBmaWxlLlxuICAgKlxuICAgKiBXaGVuIHRoZSBkYXRhYmFzZSBpcyBkZXNlcmlhbGl6ZWQsIHRoZSBjb250ZW50cyBvZlxuICAgKiB0aGUgcGFzc2VkIGBkYXRhYCBidWZmZXIgYXJlIGNvcGllZC5cbiAgICpcbiAgICogIyBFeGFtcGxlc1xuICAgKlxuICAgKiBSZXBsYWNlIHRoZSBkZWZhdWx0IChgbWFpbmApIGRhdGFiYXNlIHNjaGVtYVxuICAgKiB3aXRoIHRoZSBjb250ZW50cyBmcm9tIGBkYXRhYC5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBkYi5kZXNlcmlhbGl6ZShkYXRhKTtcbiAgICogYGBgXG4gICAqXG4gICAqIENyZWF0ZSBhbiBpbi1tZW1vcnkgZGF0YWJhc2UgZnJvbSBhIGJ1ZmZlci5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBkYiA9IG5ldyBEQigpO1xuICAgKiBkYi5kZXNlcmlhbGl6ZShkYXRhKTtcbiAgICogYGBgXG4gICAqXG4gICAqIERlc2VyaWFsaXplIGBkYXRhYCBhcyBhIHJlYWQtb25seSBkYXRhYmFzZS5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBkYi5kZXNlcmlhbGl6ZShkYXRhLCB7IG1vZGU6IFwicmVhZFwiIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogU3BlY2lmeSBhIHNjaGVtYSBuYW1lIGRpZmZlcmVudCBmcm9tIGBtYWluYC5cbiAgICogTm90ZSB0aGF0IGl0IGlzIG5vdCBwb3NzaWJsZSB0byBkZXNlcmlhbGl6ZSBpbnRvXG4gICAqIHRoZSBgdGVtcGAgZGF0YWJhc2UuXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogZGIuZXhlY3V0ZShcIkFUVEFDSCBEQVRBQkFTRSAnOm1lbW9yeTonIEFTIG90aGVyXCIpOyAvLyBjcmVhdGUgc2NoZW1hICdvdGhlcidcbiAgICogZGIuZGVzZXJpYWxpemUoZGF0YSwgeyBzY2hlbWE6IFwib3RoZXJcIiB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEZvciBtb3JlIGRldGFpbHMgc2VlIGh0dHBzOi8vd3d3LnNxbGl0ZS5vcmcvYzNyZWYvZGVzZXJpYWxpemUuaHRtbFxuICAgKiBhbmQgaHR0cHM6Ly93d3cuc3FsaXRlLm9yZy9sYW5nX2F0dGFjaC5odG1sLlxuICAgKi9cbiAgZGVzZXJpYWxpemUoZGF0YTogVWludDhBcnJheSwgb3B0aW9ucz86IFNxbGl0ZURlc2VyaWFsaXplT3B0aW9ucykge1xuICAgIGNvbnN0IGRhdGFQdHIgPSB0aGlzLiN3YXNtLnNxbGl0ZV9tYWxsb2MoZGF0YS5sZW5ndGgpO1xuICAgIGlmIChkYXRhUHRyID09PSBWYWx1ZXMuTnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKFwiT3V0IG9mIG1lbW9yeS5cIiwgU3RhdHVzLlNxbGl0ZU5vTWVtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbWVtID0gbmV3IFVpbnQ4QXJyYXkoXG4gICAgICAgIHRoaXMuI3dhc20ubWVtb3J5LmJ1ZmZlcixcbiAgICAgICAgZGF0YVB0cixcbiAgICAgICAgZGF0YS5sZW5ndGgsXG4gICAgICApO1xuICAgICAgbWVtLnNldChkYXRhKTtcbiAgICB9XG5cbiAgICBsZXQgZmxhZ3MgPSBEZXNlcmlhbGl6ZUZsYWdzLkZyZWVPbkNsb3NlO1xuICAgIHN3aXRjaCAob3B0aW9ucz8ubW9kZSkge1xuICAgICAgY2FzZSBcInJlYWRcIjpcbiAgICAgICAgZmxhZ3MgfD0gRGVzZXJpYWxpemVGbGFncy5SZWFkT25seTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwid3JpdGVcIjpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGZsYWdzIHw9IERlc2VyaWFsaXplRmxhZ3MuUmVzaXplYWJsZTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NoZW1hID0gb3B0aW9ucz8uc2NoZW1hID8/IFwibWFpblwiO1xuICAgIGNvbnN0IHN0YXR1cyA9IHNldFN0cihcbiAgICAgIHRoaXMuI3dhc20sXG4gICAgICBzY2hlbWEsXG4gICAgICAoc2NoZW1hUHRyKSA9PlxuICAgICAgICB0aGlzLiN3YXNtLmRlc2VyaWFsaXplKHNjaGVtYVB0ciwgZGF0YVB0ciwgZGF0YS5sZW5ndGgsIGZsYWdzKSxcbiAgICApO1xuICAgIGlmIChzdGF0dXMgIT09IFN0YXR1cy5TcWxpdGVPaykge1xuICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIGRlc2VyaWFsaXplIGludG8gZGF0YWJhc2UgJyR7c2NoZW1hfSdgLFxuICAgICAgICBzdGF0dXMsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgY3VzdG9tIChzY2FsYXIpIFNRTCBmdW5jdGlvbiB0aGF0IGNhbiBiZVxuICAgKiB1c2VkIGluIHF1ZXJpZXMuXG4gICAqXG4gICAqICMgRXhhbXBsZXNcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBsb2cgPSAodmFsdWU6IHVua25vd24pID0+IHtcbiAgICogICBjb25zb2xlLmxvZyh2YWx1ZSk7XG4gICAqICAgcmV0dXJuIHZhbHVlO1xuICAgKiB9O1xuICAgKiBkYi5jcmVhdGVGdW5jdGlvbihsb2cpO1xuICAgKiBkYi5xdWVyeShcIlNFTEVDVCBuYW1lLCBsb2codXBkYXRlZF9hdCkgRlJPTSB1c2Vyc1wiKTtcbiAgICogYGBgXG4gICAqXG4gICAqIElmIGEgZnVuY3Rpb24gaXMgcHVyZSAoaS5lLiBhbHdheXMgcmV0dXJucyB0aGUgc2FtZSByZXN1bHRcbiAgICogZ2l2ZW4gdGhlIHNhbWUgaW5wdXQpLCBpdCBjYW4gYmUgbWFya2VkIGFzIGBkZXRlcm1pbmlzdGljYCB0b1xuICAgKiBlbmFibGUgYWRkaXRpb25hbCBvcHRpbWl6YXRpb25zLlxuICAgKlxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IGRpc2NvdW50ID0gKHByaWNlOiBudW1iZXIsIHNhbGVQZXJjZW50OiBudW1iZXIpID0+IG51bSAqICgxIC0gc2FsZVBlcmNlbnQgLyAxMDApO1xuICAgKiBkYi5jcmVhdGVGdW5jdGlvbihkaXNjb3VudCwgeyBkZXRlcm1pbmlzdGljOiB0cnVlIH0pO1xuICAgKiBkYi5xdWVyeShcIlNFTEVDVCBuYW1lLCBkaXNjb3VudChwcmljZSwgOnNhbGUpIEZST00gcHJvZHVjdHNcIiwgeyBzYWxlOiAxNSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoZSBmdW5jdGlvbiBuYW1lIGNhbiBiZSBzZXQgZXhwbGljaXRseS5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBkYi5jcmVhdGVGdW5jdGlvbigoKSA9PiBNYXRoLnJhbmRvbSgpLCB7IG5hbWU6IFwianNSYW5kb21cIiB9KTtcbiAgICogZGIucXVlcnkoXCJTRUxFQ1QganNSYW5kb20oKVwiKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEZ1bmN0aW9ucyBjYW4gYWxzbyB0YWtlIGEgdmFyaWFibGUgbnVtYmVyIG9mIGFyZ3VtZW50cy5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBzdW0gPSAoLi4ubnVtczogbnVtYmVyW10pID0+IG51bXMucmVkdWNlKChzdW0sIG51bSkgPT4gc3VtICsgbnVtLCAwKTtcbiAgICogZGIuY3JlYXRlRnVuY3Rpb24oc3VtLCB7IGRldGVybWluaXN0aWM6IHRydWUgfSk7XG4gICAqIGRiLnF1ZXJ5KFwiU0VMRUNUIHN1bSgxLCAyKSwgc3VtKDEsMiwzLDQpXCIpO1xuICAgKiBgYGBcbiAgICovXG4gIGNyZWF0ZUZ1bmN0aW9uPFxuICAgIEEgZXh0ZW5kcyBBcnJheTxTcWxGdW5jdGlvbkFyZ3VtZW50PiA9IEFycmF5PFNxbEZ1bmN0aW9uQXJndW1lbnQ+LFxuICAgIFIgZXh0ZW5kcyBTcWxGdW5jdGlvblJlc3VsdCA9IFNxbEZ1bmN0aW9uUmVzdWx0LFxuICA+KGZ1bmM6ICguLi5hcmdzOiBBKSA9PiBSLCBvcHRpb25zPzogU3FsaXRlRnVuY3Rpb25PcHRpb25zKSB7XG4gICAgY29uc3QgbmFtZSA9IG9wdGlvbnM/Lm5hbWUgPz8gZnVuYy5uYW1lO1xuICAgIGlmIChuYW1lID09PSBcIlwiKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoXCJGdW5jdGlvbiBuYW1lIGNhbiBub3QgYmUgZW1wdHlcIik7XG4gICAgfSBlbHNlIGlmICh0aGlzLiNmdW5jdGlvbk5hbWVzLmhhcyhuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKGBBIGZ1bmN0aW9uIG5hbWVkICcke25hbWV9JyBhbHJlYWR5IGV4aXN0c2ApO1xuICAgIH1cblxuICAgIGNvbnN0IGFyZ2MgPSBmdW5jLmxlbmd0aCA9PT0gMCA/IC0xIDogZnVuYy5sZW5ndGg7XG4gICAgbGV0IGZsYWdzID0gMDtcbiAgICBpZiAob3B0aW9ucz8uZGV0ZXJtaW5pc3RpYyA/PyBmYWxzZSkgZmxhZ3MgfD0gRnVuY3Rpb25GbGFncy5EZXRlcm1pbmlzdGljO1xuICAgIGlmIChvcHRpb25zPy5kaXJlY3RPbmx5ID8/IHRydWUpIGZsYWdzIHw9IEZ1bmN0aW9uRmxhZ3MuRGlyZWN0T25seTtcbiAgICBsZXQgZnVuY0lkeCA9IDA7XG4gICAgd2hpbGUgKHRoaXMuI2Z1bmN0aW9uc1tmdW5jSWR4XSAhPSB1bmRlZmluZWQpIGZ1bmNJZHgrKztcbiAgICBjb25zdCBzdGF0dXMgPSBzZXRTdHIoXG4gICAgICB0aGlzLiN3YXNtLFxuICAgICAgbmFtZSxcbiAgICAgIChuYW1lKSA9PiB0aGlzLiN3YXNtLmNyZWF0ZV9mdW5jdGlvbihuYW1lLCBhcmdjLCBmbGFncywgZnVuY0lkeCksXG4gICAgKTtcblxuICAgIGlmIChzdGF0dXMgIT09IFN0YXR1cy5TcWxpdGVPaykge1xuICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKHRoaXMuI3dhc20sIHN0YXR1cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuI2Z1bmN0aW9uc1tmdW5jSWR4XSA9IHdyYXBTcWxGdW5jdGlvbihcbiAgICAgICAgdGhpcy4jd2FzbSxcbiAgICAgICAgbmFtZSxcbiAgICAgICAgLyogVGhpcyBjYXN0IGlzIG5vdCBmdWxseSBjb3JyZWN0IChiZWNhdXNlIGZ1bmN0aW9uIGFyZ3VtZW50c1xuICAgICAgICAgKiBhcmUgY29udHJhLXZhcmlhbnQpLCBidXQgbWFrZXMgZGVmaW5pbmcgY3VzdG9tIGZ1bmN0aW9uc1xuICAgICAgICAgKiBzbGlnaHRseSBuaWNlci4gKi9cbiAgICAgICAgZnVuYyBhcyB1bmtub3duIGFzIFNxbEZ1bmN0aW9uLFxuICAgICAgKTtcbiAgICAgIHRoaXMuI2Z1bmN0aW9uTmFtZXMuc2V0KG5hbWUsIGZ1bmNJZHgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGUgYSB1c2VyLWRlZmluZWQgU1FMIGZ1bmN0aW9uIHByZXZpb3VzbHlcbiAgICogY3JlYXRlZCB3aXRoIGBjcmVhdGVGdW5jdGlvbmAuXG4gICAqXG4gICAqIEFmdGVyIHRoZSBmdW5jdGlvbiBpcyBkZWxldGVkLCBpdCBjYW4gbm8gbG9uZ2VyIGJlXG4gICAqIHVzZWQgaW4gcXVlcmllcywgYW5kIGlzIGZyZWUgdG8gYmUgcmUtZGVmaW5lZC5cbiAgICpcbiAgICogIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3QgZG91YmxlID0gKG51bTogbnVtYmVyKSA9PiBudW0gKiAyO1xuICAgKiBkYi5jcmVhdGVGdW5jdGlvbihkb3VibGUpO1xuICAgKiAvLyB1c2UgdGhlIGZ1bmN0aW9uIC4uLlxuICAgKiBkYi5kZWxldGVGdW5jdGlvbihcImRvdWJsZVwiKTtcbiAgICogYGBgXG4gICAqL1xuICBkZWxldGVGdW5jdGlvbihuYW1lOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy4jZnVuY3Rpb25OYW1lcy5oYXMobmFtZSkpIHtcbiAgICAgIGNvbnN0IHN0YXR1cyA9IHNldFN0cihcbiAgICAgICAgdGhpcy4jd2FzbSxcbiAgICAgICAgbmFtZSxcbiAgICAgICAgKHB0cykgPT4gdGhpcy4jd2FzbS5kZWxldGVfZnVuY3Rpb24ocHRzKSxcbiAgICAgICk7XG4gICAgICBpZiAoc3RhdHVzID09PSBTdGF0dXMuU3FsaXRlT2spIHtcbiAgICAgICAgY29uc3QgZnVuY0lkeCA9IHRoaXMuI2Z1bmN0aW9uTmFtZXMuZ2V0KG5hbWUpITtcbiAgICAgICAgdGhpcy4jZnVuY3Rpb25OYW1lcy5kZWxldGUobmFtZSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLiNmdW5jdGlvbnNbZnVuY0lkeF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IodGhpcy4jd2FzbSwgc3RhdHVzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKGBVc2VyIGRlZmluZWQgZnVuY3Rpb24gJyR7bmFtZX0nIGRvZXMgbm90IGV4aXN0YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlIHRoZSBkYXRhYmFzZS4gVGhpcyBtdXN0IGJlIGNhbGxlZCBpZlxuICAgKiB0aGUgZGF0YWJhc2UgaXMgbm8gbG9uZ2VyIHVzZWQgdG8gYXZvaWQgbGVha2luZ1xuICAgKiBvcGVuIGZpbGUgZGVzY3JpcHRvcnMuXG4gICAqXG4gICAqIElmIGNhbGxlZCB3aXRoIGBmb3JjZSA9IHRydWVgLCBhbnkgbm9uLWZpbmFsaXplZFxuICAgKiBgUHJlcGFyZWRRdWVyeWAgb2JqZWN0cyB3aWxsIGJlIGZpbmFsaXplZC4gT3RoZXJ3aXNlLFxuICAgKiB0aGlzIHRocm93cyBpZiB0aGVyZSBhcmUgYWN0aXZlIHF1ZXJpZXMuXG4gICAqXG4gICAqIGBjbG9zZWAgbWF5IHNhZmVseSBiZSBjYWxsZWQgbXVsdGlwbGVcbiAgICogdGltZXMuXG4gICAqL1xuICBjbG9zZShmb3JjZSA9IGZhbHNlKSB7XG4gICAgaWYgKCF0aGlzLiNvcGVuKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChmb3JjZSkge1xuICAgICAgZm9yIChjb25zdCBzdG10IG9mIHRoaXMuI3N0YXRlbWVudHMpIHtcbiAgICAgICAgaWYgKHRoaXMuI3dhc20uZmluYWxpemUoc3RtdCkgIT09IFN0YXR1cy5TcWxpdGVPaykge1xuICAgICAgICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcih0aGlzLiN3YXNtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy4jd2FzbS5jbG9zZSgpICE9PSBTdGF0dXMuU3FsaXRlT2spIHtcbiAgICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcih0aGlzLiN3YXNtKTtcbiAgICB9XG4gICAgdGhpcy4jb3BlbiA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsYXN0IGluc2VydGVkIHJvdyBpZC4gVGhpcyBjb3JyZXNwb25kcyB0b1xuICAgKiB0aGUgU1FMaXRlIGZ1bmN0aW9uIGBzcWxpdGUzX2xhc3RfaW5zZXJ0X3Jvd2lkYC5cbiAgICpcbiAgICogQmVmb3JlIGEgcm93IGlzIGluc2VydGVkIGZvciB0aGUgZmlyc3QgdGltZSAoc2luY2VcbiAgICogdGhlIGRhdGFiYXNlIHdhcyBvcGVuZWQpLCB0aGlzIHJldHVybnMgYDBgLlxuICAgKi9cbiAgZ2V0IGxhc3RJbnNlcnRSb3dJZCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLiN3YXNtLmxhc3RfaW5zZXJ0X3Jvd2lkKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBudW1iZXIgb2Ygcm93cyBtb2RpZmllZCwgaW5zZXJ0ZWQgb3JcbiAgICogZGVsZXRlZCBieSB0aGUgbW9zdCByZWNlbnRseSBjb21wbGV0ZWQgcXVlcnkuXG4gICAqIFRoaXMgY29ycmVzcG9uZHMgdG8gdGhlIFNRTGl0ZSBmdW5jdGlvblxuICAgKiBgc3FsaXRlM19jaGFuZ2VzYC5cbiAgICovXG4gIGdldCBjaGFuZ2VzKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuI3dhc20uY2hhbmdlcygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgbnVtYmVyIG9mIHJvd3MgbW9kaWZpZWQsIGluc2VydGVkIG9yXG4gICAqIGRlbGV0ZWQgc2luY2UgdGhlIGRhdGFiYXNlIHdhcyBvcGVuZWQuXG4gICAqIFRoaXMgY29ycmVzcG9uZHMgdG8gdGhlIFNRTGl0ZSBmdW5jdGlvblxuICAgKiBgc3FsaXRlM190b3RhbF9jaGFuZ2VzYC5cbiAgICovXG4gIGdldCB0b3RhbENoYW5nZXMoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy4jd2FzbS50b3RhbF9jaGFuZ2VzKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBgdHJ1ZWAgd2hlbiBpbiBhdXRvIGNvbW1pdCBtb2RlIGFuZCBgZmFsc2VgIG90aGVyd2lzZS5cbiAgICogVGhpcyBjb3JyZXNwb25kcyB0byB0aGUgU1FMaXRlIGZ1bmN0aW9uXG4gICAqIGBzcWxpdGUzX2dldF9hdXRvY29tbWl0YC5cbiAgICovXG4gIGdldCBhdXRvQ29tbWl0KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiN3YXNtLmF1dG9jb21taXQoKSAhPT0gMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBkYXRhYmFzZSBoYW5kbGUgaXMgY2xvc2VkXG4gICAqIGFuZCBjYW4gbm8gbG9uZ2VyIGJlIHVzZWQuXG4gICAqL1xuICBnZXQgaXNDbG9zZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICF0aGlzLiNvcGVuO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxXQUFXLFFBQTRCLHFCQUFxQjtBQUNyRSxTQUFTLE1BQU0sUUFBUSxZQUFZO0FBQ25DLFNBQ0UsZ0JBQWdCLEVBQ2hCLGFBQWEsRUFDYixTQUFTLEVBQ1QsTUFBTSxFQUNOLE1BQU0sUUFDRCxpQkFBaUI7QUFDeEIsU0FBUyxXQUFXLFFBQVEsYUFBYTtBQUN6QyxTQUFTLGFBQWEsUUFBMkMsYUFBYTtBQUM5RSxTQUlFLGVBQWUsUUFDVixnQkFBZ0I7QUFvSHZCOzs7Q0FHQyxHQUNELE9BQU8sTUFBTTtFQUNYLENBQUEsSUFBSyxDQUFPO0VBQ1osQ0FBQSxTQUFVLENBQWdDO0VBQzFDLENBQUEsSUFBSyxDQUFVO0VBRWYsQ0FBQSxVQUFXLENBQW9CO0VBQy9CLENBQUEsYUFBYyxDQUFzQjtFQUNwQyxDQUFBLGdCQUFpQixDQUFTO0VBRTFCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTBCQyxHQUNELFlBQVksT0FBZSxVQUFVLEVBQUUsVUFBeUIsQ0FBQyxDQUFDLENBQUU7SUFDbEUsTUFBTSxXQUFXO0lBQ2pCLElBQUksQ0FBQyxDQUFBLElBQUssR0FBRyxTQUFTLE9BQU87SUFDN0IsSUFB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
// denoCacheMetadata=4565911873371034092,6305697722067860931